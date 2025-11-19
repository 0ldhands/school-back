const express = require('express');
const router = express.Router();
const moment = require('moment');
const multer = require('multer');
const currentDate = moment().format('YYYY-MM-DD HH:mm:ss');

module.exports = (db, upload) => {

    router.post('/saveStaff', upload.single('staff_img'), async (req, res) => {
      console.log(req.body);
      
      try {
          const { dept_id, role_id, staff_name, email, mobile, gender, qualification, experience, address } = req.body;
          const staff_img = req.file ? req.file.filename : null;

          if (!dept_id) {
              return res.status(400).json({ message: "Department is required" });
          }
          if (!role_id) {
              return res.status(400).json({ message: "Role is required" });
          }
          if (!staff_name) {
              return res.status(400).json({ message: "Staff name is required" });
          }
          if (!email) {
              return res.status(400).json({ message: "Staff Email is required" });
          }
          if (!mobile) {
              return res.status(400).json({ message: "Staff Mobile is required" });
          }
          if (!gender) {
              return res.status(400).json({ message: "Staff Gender is required" });
          }
          if (!qualification) {
              return res.status(400).json({ message: "Staff qualification is required" });
          }
          if (!experience) {
              return res.status(400).json({ message: "Staff experience is required" });
          }
          if (!address) {
              return res.status(400).json({ message: "Staff address is required" });
          }
          

          const existingStaffQuery = `SELECT * FROM staffs_master WHERE email = ? OR mobile = ?`;
          const [existingStaffResults] = await db.query(existingStaffQuery, [email, mobile]);

          if (existingStaffResults.length > 0) {
              if (existingStaffResults[0].isAlive == 0) {
                  return res.status(400).json({ message: "This employee is waiting for rejoining approval. Please confirm with the principal." });
              } else {
                  return res.status(400).json({ message: "Employee with this email or mobile already exists." });
              }
          }

          const saveQuery = `
              INSERT INTO staffs_master 
              (dept_id, role_id, staff_name, email, mobile, gender, qualification, experience, address, staff_img, created_at) 
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `;
          const [results] = await db.query(saveQuery, [dept_id, role_id, staff_name, email, mobile, gender, qualification, experience, address, staff_img, currentDate]);

          if (results.affectedRows === 1) {
              return res.status(200).json({ message: "Staff saved successfully." });
          } else {
              return res.status(500).json({ message: "Failed to save staff data." });
          }

      } catch (error) {
          console.error("Error saving staff data:", error);
          return res.status(500).json({ message: "Internal server error." });
      }
  });


    router.get("/getStaffs", async (req, res) => {
      try {
        const getQuery = `SELECT staffs_master.*, dept.dept_name, role.role_name FROM staffs_master INNER JOIN department dept ON staffs_master.dept_id = dept.dept_id INNER JOIN role ON staffs_master.role_id = role.role_id where staffs_master.isAlive=1`;
        const [results] = await db.query(getQuery);
        if (results.length == 0) {
          return res.status(404).json({ message: "Sections data not found." });
        } else {
          const convertData = results.map((result) => ({
            ...result,
            staff_img: `http://localhost:3001/uploads/${result.staff_img}` 
          }));
          return res.status(200).json(convertData);
        }
      } catch (error) {
        console.error("Error fetching sections data:", error);
        return res.status(500).json({ message: "Internal server error." });
      }
    });

   
router.get("/getStaffdash/:staff_id", async (req, res) => {
  try {
    const staff_id = req.params.staff_id;
    const getQuery = `SELECT * FROM staffs_master WHERE staff_id = ?`;
    const [results] = await db.query(getQuery, [staff_id]);

    if (results.length === 0) {
      return res.status(404).json({ message: "Staff data not found." });
    } else {
      const convertData = results.map((result) => ({
        ...result,
        staff_img: `http://localhost:3001/uploads/${result.staff_img}`
      }));
      console.log(convertData);
      return res.status(200).json(convertData);
    }
  } catch (error) {
    console.error("Error fetching staff data:", error);
    return res.status(500).json({ message: "Internal server error." });
  }
});

    router.put('/updateStaff/:staffId', upload.single('staff_img'), async (req, res) => {
      try {
        const staffId = req.params.staffId;
        const { dept_id, role_id, staff_name, email, mobile, gender, qualification, experience, address } = req.body;
        const staff_img = req.file ? req.file.filename : null;
        if(!staffId){
          return res.status(400).json({message:"Staff ID is required"});
        }
        if(!dept_id){
          return res.status(400).json({message:"Department is required"});
        }
        if(!role_id){
          return res.status(400).json({message:"Role is required"});
        }
        if(!staff_name){
          return res.status(400).json({message:"Staff name is required"});
        }
        if(!email){
          return res.status(400).json({message:"Staff Email is required"});
        }
        if(!mobile){
          return res.status(400).json({message:"Staff Mobile is required"});
        }
        if(!gender){
          return res.status(400).json({message:"Staff Gender is required"});
        }
        if(!qualification){
          return res.status(400).json({message:"Staff qualification is required"});
        }
        if(!experience){
          return res.status(400).json({message:"Staff experience is required"});
        }
        if(!address){
          return res.status(400).json({message:"Staff address is required"});
        }
        const staffExistsQuery = `SELECT * FROM staffs_master WHERE staff_id = ?`;
        const [staffExistsResults] = await db.query(staffExistsQuery, [staffId]);
        if (staffExistsResults.length === 0) {
          return res.status(404).json({ message: "Staff not found." });
        }
        const existingStaffQuery = `SELECT * FROM staffs_master WHERE (email = ? OR mobile = ?) AND staff_id != ?`;
        const [existingStaffResults] = await db.query(existingStaffQuery, [email, mobile, staffId]);
  
        if (existingStaffResults.length > 0) {
          if (existingStaffResults[0].isAlive === 0) {
            return res.status(400).json({ message: "This employee is waiting for rejoining approval. Please confirm with the principal." });
          } else {
            return res.status(400).json({ message: "Employee with this email or mobile already exists." });
          }
        }
        let updateQuery = '';
        let updateData = [];
        if (staff_img) {
          updateQuery = `
            UPDATE staffs_master 
            SET dept_id = ?, role_id = ?, staff_name = ?, email = ?, mobile = ?, gender = ?, qualification = ?, experience = ?, address = ?, staff_img = ?, updated_at = ? 
            WHERE staff_id = ?
          `;
          updateData = [dept_id, role_id, staff_name, email, mobile, gender, qualification, experience, address, staff_img, currentDate, staffId];
        } else {
          updateQuery = `
            UPDATE staffs_master 
            SET dept_id = ?, role_id = ?, staff_name = ?, email = ?, mobile = ?, gender = ?, qualification = ?, experience = ?, address = ?, updated_at = ? 
            WHERE staff_id = ?
          `;
          updateData = [dept_id, role_id, staff_name, email, mobile, gender, qualification, experience, address, currentDate, staffId];
        }
        const [results] = await db.query(updateQuery, updateData);
        if (results.affectedRows === 0) {
          return res.status(404).json({ message: "Staff not found or no changes made." });
        } else {
          return res.status(200).json({ message: "Staff updated successfully." });
        }
      } catch (error) {
        console.error("Error updating staff data:", error);
        return res.status(500).json({ message: "Internal server error." });
      }
    });

    router.put('/resignedStaff/:staffId', async (req, res) => {
      try {
        const staffId = req.params.staffId;
        const { reason } = req.body;
        if (!staffId) {
          return res.status(400).json({ message: "Staff Id is required." });
        }
        if (!reason) {
          return res.status(400).json({ message: "Reason is required." });
        }
        const checkStaffQuery = `SELECT * FROM staffs_master WHERE staff_id = ? AND isAlive = 1`;
        const [checkStaffResults] = await db.query(checkStaffQuery, [staffId]);
        if (checkStaffResults.length === 0) {
          return res.status(404).json({ message: "Staff not found or already resigned." });
        }
        const updateQuery = `UPDATE staffs_master SET isAlive = 0 WHERE staff_id = ?`;
        const [updateResults] = await db.query(updateQuery, [staffId]);
        if (updateResults.affectedRows === 0) {
          return res.status(404).json({ message: "Staff not found or no changes made." });
        }
        const insertQuery = `INSERT INTO resigned_staff (staff_id, reason) VALUES (?, ?)`;
        const [insertResults] = await db.query(insertQuery, [staffId, reason]);
        if (insertResults.affectedRows === 1) {
          return res.status(200).json({ message: "Staff resigned successfully." });
        } else {
          return res.status(500).json({ message: "Failed to record resignation reason." });
        }
      } catch (err) {
        console.error("Error resigning staff data:", err);
        return res.status(500).json({ message: "Internal server error." });
      }
    });

    router.delete('/deleteStaff/:staffId',async(req,res)=>{
      try{
        const staffId = req.params.staffId;
        if(!staffId){
          return res.status(400).json({message:"Staff ID is required."})
        }
        const deleteQuery = `delete from staffs_master where staff_id = ?`
        const [results] = await db.query(deleteQuery,[staffId]);
        if(results.affectedRows === 0){
          return res.status(404).json({message:"Staff data not found or no data deleted"})
        }else{
          return res.status(200).json({ message: "Students deleted successfully." }); 
      }
      }catch(err){
        console.log("Error delete staff data :",err);
        return res.status(500).json({message:"Internal server error."})
      }
    })


    router.get("/getTeachingStaffs", async (req, res) => {
      try {
        const getQuery = `select staff_id,staff_name from staffs_master where dept_id = 2 and isAlive = 1`;
        const [results] = await db.query(getQuery);
        if (results.length == 0) {
          return res.status(404).json({ message: "Sections data not found." });
        } else {
          
          return res.status(200).json(results);
        }
      } catch (error) {
        console.error("Error fetching sections data:", error);
        return res.status(500).json({ message: "Internal server error." });
      }
    });
    router.post('/empEntry/:staff_id', (req, res) => {
        console.log(req.body);
    
        try {
            const staff_id = req.params.staff_id;
            const currentDateTime = moment(req.body.datetime).format('YYYY-MM-DD HH:mm:ss');
            const currentDate = moment(currentDateTime).format('YYYY-MM-DD');
    
          
    
                const insertData = 'INSERT INTO staffs_attendance (staff_id, entry_at, created_at, updated_at) VALUES (?, ?, ?, ?)';
                db.query(insertData, [staff_id, currentDateTime, currentDateTime, currentDateTime], (insertErr, insertRes) => {
                    if (insertErr) {
                        console.error(insertErr);
                        return res.status(500).json({ message: "Internal server error." });
                    }
                   return res.status(200).json({ message: "Entry recorded successfully." });
                });
            
        } catch (err) {
            console.error(err);
           return res.status(500).json({ message: "Internal server error." });
        }
    });
    
    // Route for recording exit
    router.post('/empExit/:staff_id', (req, res) => {
        console.log(req.body);
        try {
            const staff_id = req.params.staff_id;
            const currentDateTime = moment(req.body.datetime).format('YYYY-MM-DD HH:mm:ss');
            const currentDate = moment(currentDateTime).format('YYYY-MM-DD');
    
         
    
                const updateData = 'UPDATE staffs_attendance SET exit_at = ?, updated_at = ? WHERE staff_id = ? AND DATE(entry_at) = ?';
                db.query(updateData, [currentDateTime, currentDateTime, staff_id, currentDate], (updateErr, updateRes) => {
                    if (updateErr) {
                        console.error(updateErr);
                        return res.status(500).json({ message: "Internal server error." });
                    }
                   return res.status(200).json({ message: "Exit recorded successfully." });
                });
          
        } catch (err) {
            console.error(err);
            return res.status(500).json({ message: "Internal server error." });
        }
    });
 router.get(`/getattenancedetails/:staff_id`,async(req,res)=>{
  try{
    const staff_id =req.params.staff_id
    const getQuery =`select * from staffs_attendance where staff_id =?`

    const [results]=await db.query(getQuery,staff_id)
    if (results.length == 0) {
      return res.status(404).json({ message: "attenance data not found." });
    } else {
      
      return res.status(200).json(results);
    }
  } catch (error) {
    console.error("Error fetching attenance data:", error);
    return res.status(500).json({ message: "Internal server error." });

  }
 })


    return router;
};
