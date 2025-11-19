const express = require("express");
const router = express.Router();
const moment = require("moment");
const currentDate = moment().format("YYYY-MM-DD HH:mm:ss");
module.exports = (db) => {
  router.post("/saveDept", async (req, res) => {
    try {
      const { dept_name } = req.body;
      console.log("Department Name :",dept_name)
      if (!dept_name) {
        return res
          .status(400)
          .json({ message: "Department name is required." });
      }
      const checkQuery = `SELECT COUNT(*) as count FROM department WHERE dept_name = ?`;
      const [rows] = await db.query(checkQuery, [dept_name]);
      const { count } = rows[0];
      if (count > 0) {
        return res
          .status(400)
          .json({ message: "Department with the same name already exists." });
      }
      const saveQuery = `INSERT INTO department (dept_name, created_at) VALUES (?, ?)`;
      const [results] = await db.query(saveQuery, [dept_name, currentDate]);
      if(results.affectedRows === 1){
        return  res.status(200).json({ message: "Department data added successfully." });
      }else {
        return  res.status(500).json({ message: "Failed to add department data." });
    }
    } catch (error) {
      console.error("Error saving department data:", error);
      res.status(500).json({ message: "Internal server error." });
    }
  });

  router.get("/getDept", async (req, res) => {
    try {
      const getQuery = `select * from department`;
      const [results] = await db.query(getQuery);
      if (results.length == 0) {
        return res.status(404).json({ message: "Department data not found." });
      } else {
        return res.status(200).json(results);
      }
    } catch (error) {
      console.error("Error fetching department data:", error);
      return res.status(500).json({ message: "Internal server error." });
    }
  });

  router.put("/updateDept/:deptId", async (req, res) => {
    try {
      const deptId = req.params.deptId;
      const { dept_name } = req.body;
      if (!dept_name || !deptId) {
        return res
          .status(400)
          .json({ message: "Department id and name is required." });
      }
      const updateQuery = `update department set dept_name=?,updated_at=? where dept_id=?`;
      const [results] = await db.query(updateQuery, [dept_name,currentDate, deptId]);
      if (results.affectedRows === 0) {
        return res
          .status(404)
          .json({ message: "Department not found or no changes made." });
      } else {
        return res.status(200).json({ message: "Department updated successfully." });
      }
    } catch (err) {
      console.log("Error update department data:", err);
      return res.status(500).json({ message: "Internal server error." });
    }
  });

  router.delete('/deleteDept/:deptId',async(req,res)=>{
    try{
        const deptId = req.params.deptId;
        if(!deptId){
          return res.status(400).json({message:"Department ID is required."})
        }
        const deleteQuery = `delete from department where dept_id = ?`;
        const [results] = await db.query(deleteQuery,[deptId]);
        if(results.affectedRows === 0){
          return res.status(404).json({message:"Department data not found or no data deleted"})
        }else{
          return res.status(200).json({ message: "Department deleted successfully." }); 
        }

    }catch(err){
        console.log("Error delete department data :",err);
        return res.status(500).json({message:"Internal server error."})
    }
  })

  return router;
};
