const asyncHandler = require("express-async-handler");
const questionModel=require("../models/questionModel");
const infopostModel=require("../models/infopostModel");


const getContent = asyncHandler(async (req, res) => {
    const { type, tag } = req.body;
    console.log(type,tag)
  
    if (!type || !tag) {
      return res.status(400).json({ message: "Type and tag are required" });
    }
  
    let model;
    if (type === 'question') {
      model = questionModel;
    } else if (type === 'infopost') {
      model = infopostModel; 
    } else {
      return res.status(400).json({ message: "Invalid type:  Must be 'question' or 'infopost'" });
    }
  
    try {
      const content = await model.find({ tag: tag, hidden: false }).sort({ createdAt: -1 });
      res.json(content);
    } catch (err) {
      res.status(500).json({ message: "Error occurred while fetching content" });
    }
  });

module.exports={getContent};
  