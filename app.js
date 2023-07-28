//jshint esversion:6

const express = require("express");
const bodyParser = require("body-parser");
const { default: mongoose } = require("mongoose");
const _ = require("lodash");
const app = express();
const dotenv = require("dotenv");
dotenv.config();
app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

mongoose.connect(process.env.mongodb_url, { useNewUrlParser: true });


const itemSchema = {
  name: String,
}
const Item = mongoose.model("I tem", itemSchema);
const item1 = new Item({
  name: "welcome to your to do list"
});

const defaultItems = [item1];


const listSchema = {
  name: String,
  items: [itemSchema],
};
const List = mongoose.model("List", listSchema);
app.get("/", function (req, res) {
  Item.find({}).then(foundItems => {
    if (foundItems.length === 0) {
      Item.insertMany(defaultItems);
      res.redirect("/");
    }
    else
      res.render("list", { listTitle: "Today", newListItems: foundItems });
  }).catch(err => {
    console.error("Error fetching items:", err);
    res.status(500).send("Internal Server Error");
  });
});

app.get("/:customListName", async function (req, res) {
  const customListName = _.capitalize(req.params.customListName);

  try {
    const foundList = await List.findOne({ name: customListName }).exec();
    if (!foundList) {
      // Create a new list
      const list = new List({
        name: customListName,
        items: defaultItems,
      });
      await list.save();
      res.redirect("/" + customListName);
    } else {
      // Show an existing list
      res.render("list", { listTitle: foundList.name, newListItems: foundList.items });
    }
  } catch (err) {
    console.error("Error finding list:", err);
    res.status(500).send("Internal Server Error");
  }
});


app.post("/", async function (req, res) {
  const itemName = req.body.newItem;
  const listName = req.body.list;
  const item = new Item({
    name: itemName
  });

  if (listName === "Today") {
    await item.save();
    res.redirect("/");
  } else {
    try {
      const foundList = await List.findOne({ name: listName }).exec();
      foundList.items.push(item);
      await foundList.save();
      res.redirect("/" + listName);
    } catch (err) {
      console.error("Error finding list:", err);
      res.status(500).send("Internal Server Error");
    }
  }
});

app.post("/delete", async function (req, res) {
  const checkedItemId = req.body.checkbox;
  const listName = req.body.listName;

  if (listName === "Today") {
    try {
      await Item.findByIdAndRemove(checkedItemId);
      console.log("Successfully deleted checked item");
      res.redirect("/");
    } catch (err) {
      console.error("Error deleting item:", err);
      res.status(500).send("Internal Server Error");
    }
  } else {
    try {
      const foundList = await List.findOneAndUpdate(
        { name: listName },
        { $pull: { items: { _id: checkedItemId } } }
      ).exec();
      if (!foundList) {
        // Handle case when custom list is not found
        console.log("Custom list not found");
        // You can redirect to the homepage or show an error message here
        res.redirect("/");
      } else {
        console.log("Successfully deleted item from custom list");
        res.redirect("/" + listName);
      }
    } catch (err) {
      console.error("Error deleting item from custom list:", err);
      res.status(500).send("Internal Server Error");
    }
  }
});


app.get("/work", function (req, res) {
  res.render("list", { listTitle: "Work List", newListItems: workItems });
});

app.get("/about", function (req, res) {
  res.render("about");
});

app.listen(3000, function () {
  console.log("Server started on port 3000");
});
