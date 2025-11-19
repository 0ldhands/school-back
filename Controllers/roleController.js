const express = require('express');
const router = express.Router();
const moment = require('moment');
const currentDate = moment().format("YYYY-MM-DD HH:mm:ss");
module.exports = (db) => {

    router.post('/saveRole', async (req, res) => {
        try {
            const { dept_id, role_name } = req.body;
            if (!dept_id) {
                return res.status(400).json({ message: "Department ID is required" });
            }
            if (!role_name) {
                return res.status(400).json({ message: "Role name is required" });
            }
            const checkQuery = 'SELECT COUNT(*) AS count FROM role WHERE dept_id = ? AND role_name = ?';
            const [checkResults] = await db.query(checkQuery, [dept_id, role_name]); 
            if (checkResults[0].count > 0) {
                return res.status(400).json({ message: "Role name already exists for the given department" });
            }
            const saveQuery = 'INSERT INTO role (dept_id, role_name, created_at) VALUES (?, ?, ?)';
            const [results] = await db.query(saveQuery, [dept_id, role_name, currentDate]);
            if (results.affectedRows === 1) {
                return  res.status(200).json({ message: "Role data added successfully." });
            } else {
                return  res.status(500).json({ message: "Failed to add role data." });
            }
        } catch (err) {
            console.error("Error saving Role data:", err);
            return res.status(500).json({ message: "Internal server error." });
        }
    });


    router.get('/getRole',async(req,res)=>{
        try{
            const getQuery = `select role.*,dept.dept_name from role inner join department dept on role.dept_id = dept.dept_id`;
            const [results] = await db.query(getQuery);
            if(results.length === 0){
                return  res.status(404).json({message:"Role data not found"})
            }else{
                return  res.status(200).json(results)
            }
        }catch(err){
            console.error("Error fetching Role data:", err);
            return  res.status(500).json({ message: "Internal server error." });
        }
    });

    router.get('/getRoleByDept',async(req,res)=>{
        try{
            const dept_id = req.query.dept_id;
            if(!dept_id){
                return res.status(400).json({message:"Department ID is required"})
            }
            const getQuery = `select * from role where dept_id = ?`;
            const [results] = await db.query(getQuery,[dept_id]);
            if(results.length === 0){
                return  res.status(404).json({message:"Role data not found"})
            }else{
                return  res.status(200).json(results)
            }
        }catch(err){
            console.error("Error fetching Role data:", err);
            return  res.status(500).json({ message: "Internal server error." });
        }
    });



    router.put('/updateRole/:roleId',async(req,res)=>{
        try{
            const roleId = req.params.roleId;
            const {role_name} = req.body;
            if(!role_name){
                return  res.status(400).json({message:"Role name is required"})
            }
            const updateQuery = `update role set role_name=?,updated_at=? where role_id=?`;
            const [results] = await db.query(updateQuery,[role_name,currentDate,roleId]);
            if(results.affectedRows === 0){
                return   res.status(404).json({message:"Role not found or no changes made."})
            }else {
                return   res.status(200).json({ message: "Role updated successfully." });
              }
        }catch(err){
            console.error("Error updating Role data:", err);
            return  res.status(500).json({ message: "Internal server error." });
        }
    })

    router.delete('/deleteRole/:roleId',async(req,res)=>{
        try{
            const roleId = req.params.roleId;
            if(!roleId){
                return   res.status(400).json({message:"Role is required."})
            }
            const deleteQuery = `delete from role where role_id = ?`;
            const [results] = await db.query(deleteQuery,[roleId]);
            if(results.affectedRows === 0){
                return  res.status(404).json({message:"Role data not found or no data deleted"})
            }else{
                return  res.status(200).json({ message: "Role deleted successfully." }); 
            }
    
        }catch(err){
            console.log("Error delete Role data :",err);
            return  res.status(500).json({message:"Internal server error."})
        }
      })

    return router;
}
