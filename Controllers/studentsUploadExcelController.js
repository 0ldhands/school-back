const express = require("express");
const router = express.Router();
const moment = require("moment");
const currentDate = moment().format("YYYY-MM-DD HH:mm:ss");
const xlsx = require("xlsx");
const path = require("path");
const fs = require("fs");

module.exports = (db, upload) => {
  router.post("/upload", upload.single("file"), (req, res) => {
    const filePath = req.file.path;
    const workbook = xlsx.readFile(filePath);
    const sheet_name_list = workbook.SheetNames;
    const jsonData = xlsx.utils.sheet_to_json(
      workbook.Sheets[sheet_name_list[0]]
    );

    // console.log("filePath", filePath);
    // console.log("jsonData", jsonData);

    // Insert data into MySQL database
    jsonData.forEach(async (row, index) => {
      console.log("index", index);
      console.log("row", row);
      await insertData(row, db);
    });

    // Delete the uploaded file
    //fs.unlinkSync(filePath);
    res.send("OK");
  });

  return router;
};

async function insertData(row, db) {
  try {
    const {
      staff_id,
      cls_id,
      scheme,
      stu_name,
      stu_aadhar,
      gender,
      dob,
      van,
      community,
      cast_name,
      religion,
      father_name,
      father_mobile,
      father_occupation,
      father_annual_income,
      mother_name,
      mother_mobile,
      mother_occupation,
      mother_annual_income,
      address,
    } = row;

    const stu_img = "sample_image";

    const apply_date = moment().format("YYYY-MM-DD");

    const saveQuery = `
            INSERT INTO students_master 
            (staff_id, cls_id, scheme, stu_name, stu_aadhar, stu_img, gender, dob,van, community, cast_name, religion, 
            father_name, father_mobile, father_occupation, father_annual_income, mother_name, mother_mobile, 
            mother_occupation, mother_annual_income, address, apply_date, created_at) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?,?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
    var dobExcel = excelDateToJSDate(dob);
    const saveParams = [
      staff_id,
      cls_id,
      scheme,
      stu_name,
      stu_aadhar,
      stu_img,
      gender,
      dobExcel,
      van,
      community,
      cast_name,
      religion,
      father_name,
      father_mobile,
      father_occupation,
      father_annual_income,
      mother_name,
      mother_mobile,
      mother_occupation,
      mother_annual_income,
      address,
      apply_date,
      currentDate,
    ];

    const [results] = await db.query(saveQuery, saveParams);

    if (results.affectedRows === 1) {
      console.log("Student data saved successfully.");
    } else {
      console.log("Failed to save student data.");
    }
  } catch (err) {
    console.log("Error saving student data:", err);
  }
}

// Function to convert Excel date serial number to JavaScript Date object
const excelDateToJSDate = (excelSerialDate) => {
  const daysSince1900 = Math.floor(excelSerialDate);
  const secondsInDay = 86400;
  const seconds = (excelSerialDate - daysSince1900) * secondsInDay;
  const date = new Date(1900, 0, daysSince1900 - 1);
  date.setSeconds(seconds);
  return date;
};
