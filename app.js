const express = require("express");
const mongoose = require("mongoose");
const _ = require("lodash");
const axios = require("axios"); // Add axios for making HTTP requests
require('dotenv').config(); // Load environment variables

const MONGO_URL = process.env.MONGO_URL;
mongoose.connect(MONGO_URL)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

const itemsSchema = {
  name: String
}

const Item = mongoose.model("Item", itemsSchema);

const item1 = new Item({
  name: "Welcome to Your To-Do Web!"
});

const item2 = new Item({
  name: "Hit the + button to add a new item."
});

const item3 = new Item({
  name: "<-- Hit this to delete an item."
});

const defaultItems = [item1, item2, item3];

const listSchema = {
  name: String,
  items: [itemsSchema]
};

const List = mongoose.model("List", listSchema);

const app = express();
app.set('view engine', 'ejs');
app.use(express.urlencoded({extended: true}));
app.use(express.static("public"));

// Interval to keep Render instance active
const url = 'https://todowebapp-h6p2.onrender.com'; // Replace with your Render URL
const interval = 600000; // Interval in milliseconds (30 seconds)

function reloadWebsite() {
  axios.get(url)
    .then(response => {
      console.log(`Reloaded at ${new Date().toISOString()}: Status Code ${response.status}`);
    })
    .catch(error => {
      console.error(`Error reloading at ${new Date().toISOString()}:`, error.message);
    });
}

setInterval(reloadWebsite, interval);

app.get("/", async function(req, res){

  try {
    const foundItems = await Item.find({});

    if (foundItems.length === 0){
      Item.insertMany(defaultItems)
        .then(() => {
          console.log("Successfully added")
        }) .catch((err) => {
          console.error("Error", err);
        });
      res.redirect("/");
    } else {
      res.render("list", {listTitle: "TODAY", newItems: foundItems});
    }
  } catch (err) {
    console.error("Error fetching items:", err);
    res.status(500).send("An error occurred while fetching items.");
  }
});

app.get("/:customListName", async function(req, res) {
  const customListName = _.capitalize(req.params.customListName);

    const foundList = await List.findOne({name: customListName});

    if (!foundList) {
      const list = new List({
        name: customListName,
        items: defaultItems
      });

      await list.save();
      res.redirect("/" + customListName);

    } else {
      res.render("list", { listTitle: foundList.name, newItems: foundList.items});
    }
});

app.post("/", async function(req, res){
  const itemName = req.body.newItem;
  const listName = req.body.list;

  const item = new Item({
    name: itemName
  });

  if (listName === "TODAY") {
    item.save();
    res.redirect("/");
  } else {
    const foundList = await List.findOne({name: listName});
    foundList.items.push(item);
    foundList.save();
    res.redirect("/" + listName);
  }
});

app.post("/delete", async function(req, res){
  const checkedItemId = req.body.checkbox;
  const listName = req.body.listName;

  if (listName === "TODAY") {
    try {
      const deleteItem = await Item.deleteOne({_id: checkedItemId})
      res.redirect("/");
    } catch (err) {
      console.error("Error", err)
    };
  } else
    try {
      await List.findOneAndUpdate(
        { name: listName },
        { $pull: { items: { _id: checkedItemId } } }
      );
      res.redirect("/" + listName);
    } catch (err) {
      console.error("Error updating list:", err);
      res.status(500).send("Internal Server Error");
    }
});

app.get("/about", function(req, res){
  res.render("about");
});


app.listen(process.env.PORT || 3000,'0.0.0.0', function () {
  console.log("Server is running on port " + (process.env.PORT || 3000));
});
