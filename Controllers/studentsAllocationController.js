const express = require('express');
const router = express.Router();
const moment = require('moment');
const currentDate = moment().format('YYYY-MM-DD HH:mm:ss');

module.exports = (db) => {

    router.post('/saveStuAllocation', async (req, res) => {
        try {
            const { staff_id, stu_id,cls_allocation_id, roll_no, academic_year } = req.body;
            if (!staff_id || !stu_id || !cls_allocation_id|| !roll_no || !academic_year) {
                return res.status(400).json({ message: "All fields are required" });
            }
            const rollNoCheckQuery = `
                SELECT COUNT(*) AS count 
                FROM students_allocation 
                WHERE roll_no = ? AND academic_year = ?
            `;
            const [rollNoCheckResults] = await db.query(rollNoCheckQuery, [roll_no, academic_year]);

            if (rollNoCheckResults[0].count > 0) {
                return res.status(400).json({ message: `Roll number ${roll_no} is already allocated for this academic year ${academic_year}` });
            }
            const studentCheckQuery = `
                SELECT COUNT(*) AS count 
                FROM students_allocation 
                WHERE stu_id = ? AND academic_year = ?
            `;
            const [studentCheckResults] = await db.query(studentCheckQuery, [stu_id, academic_year]);

            if (studentCheckResults[0].count > 0) {
                return res.status(400).json({ message: `Student ID ${stu_id} is already allocated to another class or section in the academic year ${academic_year}` });
            }
            const allocationCheckQuery = `SELECT isAllocated FROM students_master WHERE stu_id = ?`;
            const [allocationCheckResults] = await db.query(allocationCheckQuery, [stu_id]);

            if (allocationCheckResults.length === 0) {
                return res.status(404).json({ message: "Student not found" });
            }

            if (allocationCheckResults[0].isAllocated === 0) {
                const updateQuery = `UPDATE students_master SET isAllocated = 1 WHERE stu_id = ?`;
                const [updateResults] = await db.query(updateQuery, [stu_id]);

                if (updateResults.affectedRows === 0) {
                    return res.status(404).json({ message: "Student not found or no changes made" });
                }
            }
            const insertQuery = `
                INSERT INTO students_allocation (staff_id, stu_id, cls_allocation_id, roll_no, academic_year, created_at)
                VALUES (?, ?, ?, ?, ?, ?)
            `;
            const insertParams = [staff_id, stu_id, cls_allocation_id, roll_no, academic_year, currentDate];
            const [results] = await db.query(insertQuery, insertParams);

            if (results.affectedRows === 1) {
                return res.status(200).json({ message: "Student allocation saved successfully." });
            } else {
                return res.status(500).json({ message: "Failed to save student allocation." });
            }
        } catch (err) {
            console.log("Error saving allocation data:", err);
            return res.status(500).json({ message: "Internal server error." });
        }
    });

    router.post('/saveMultiStuAllocation', async (req, res) => {
        try {
            const { allocations } = req.body;
    
            if (!Array.isArray(allocations) || allocations.length === 0) {
                return res.status(400).json({ message: "Allocations array is required" });
            }
    
            for (let allocation of allocations) {
                const { staff_id, stu_id, cls_allocation_id, roll_no, academic_year } = allocation;
    
                if (!staff_id || !stu_id || !cls_allocation_id || !roll_no || !academic_year) {
                    return res.status(400).json({ message: "All fields are required for each allocation" });
                }
    
                const rollNoCheckQuery = `
                    SELECT COUNT(*) AS count 
                    FROM students_allocation 
                    WHERE roll_no = ? AND academic_year = ?
                `;
                const [rollNoCheckResults] = await db.query(rollNoCheckQuery, [roll_no, academic_year]);
    
                if (rollNoCheckResults[0].count > 0) {
                    return res.status(400).json({ message: `Roll number ${roll_no} is already allocated for this academic year ${academic_year}` });
                }
    
                const studentCheckQuery = `
                    SELECT COUNT(*) AS count 
                    FROM students_allocation 
                    WHERE stu_id = ? AND academic_year = ?
                `;
                const [studentCheckResults] = await db.query(studentCheckQuery, [stu_id, academic_year]);
    
                if (studentCheckResults[0].count > 0) {
                    return res.status(400).json({ message: `Student ID ${stu_id} is already allocated to another class or section in the academic year ${academic_year}` });
                }
    
                const allocationCheckQuery = `SELECT isAllocated FROM students_master WHERE stu_id = ?`;
                const [allocationCheckResults] = await db.query(allocationCheckQuery, [stu_id]);
    
                if (allocationCheckResults.length === 0) {
                    return res.status(404).json({ message: "Student not found" });
                }
    
                if (allocationCheckResults[0].isAllocated === 0) {
                    const updateQuery = `UPDATE students_master SET isAllocated = 1 WHERE stu_id = ?`;
                    const [updateResults] = await db.query(updateQuery, [stu_id]);
    
                    if (updateResults.affectedRows === 0) {
                        return res.status(404).json({ message: "Student not found or no changes made" });
                    }
                }
    
                const insertQuery = `
                    INSERT INTO students_allocation (staff_id, stu_id, cls_allocation_id, roll_no, academic_year, created_at)
                    VALUES (?, ?, ?, ?, ?, ?)
                `;
                const currentDate = new Date();
                const insertParams = [staff_id, stu_id, cls_allocation_id, roll_no, academic_year, currentDate];
                const [results] = await db.query(insertQuery, insertParams);
    
                if (results.affectedRows !== 1) {
                    return res.status(500).json({ message: "Failed to save student allocation for one of the students." });
                }
            }
    
            return res.status(200).json({ message: "Student allocations saved successfully." });
        } catch (err) {
            console.log("Error saving allocation data:", err);
            return res.status(500).json({ message: "Internal server error." });
        }
    });
    



    router.get("/getsecalloc/:cls_id", async (req, res) => {
        const cls_id = req.params.cls_id;
        const sql = `
          SELECT sections.sec_id, sections.sec_name 
          FROM sections
          INNER JOIN class_allocation ON sections.sec_id = class_allocation.sec_id
          WHERE class_allocation.cls_id = ?
        `;
      
        try {
          const [results] = await db.query(sql, [cls_id]);
          if (results.length === 0) {
            return res.status(404).json({ message: "Section data not found for the provided class ID." });
          }
          return res.status(200).json(results);
        } catch (error) {
          console.error("Error fetching section allocation data:", error);
          return res.status(500).json({ message: "Internal server error" });
        }
      });
      
    router.get("/studentport/:cls_id", async (req, res) => {
        try {
            const getQuery = "SELECT * FROM students_master INNER JOIN class ON students_master.cls_id = class.cls_id WHERE class.cls_id = ?";
const id = req.params.cls_id
          const [results] = await db.query(getQuery,[id]);  
          if (results.length == 0) {
            return res.status(404).json({ message: "Students data not found." });
          } else {
            const convertData = results.map((result) => ({
              ...result,
              stu_img: `http://localhost:3001/uploads/${result.stu_img}`,
            }));
            return res.status(200).json(convertData);
          }
        } catch (error) {
          console.error("Error fetching Students data:", error);
          return res.status(500).json({ message: "Internal server error." });
        }
      });


// new
router.post('/assignSection', async (req, res) => {
    const { selectedStudentsIds, selectedSectionName, selectedStaff } = req.body;
  
    let sqlQuery = 'UPDATE students_master SET section = ?, staff_id = ? WHERE ';
    const conditions = [];
    const values = [selectedSectionName, selectedStaff];
  
    selectedStudentsIds.forEach(studentId => {
      const condition = '(stu_id = ?)';
      conditions.push(condition);
      values.push(studentId);
    });
  
    sqlQuery += conditions.join(' OR ');
  
    try {
      const [result] = await db.query(sqlQuery, values);
      res.json({ affectedRows: result.affectedRows });
    } catch (error) {
      console.error('Error updating students:', error);
      res.status(500).json({ error: error });
    }
  });
  
  
  router.get("/staffs", async (req, res) => {
    try {
      const sql = "SELECT * FROM staffs_master WHERE isAlive = 1";
      const [results] = await db.query(sql);
      res.status(200).json(results);
    } catch (error) {
      console.error('Error fetching staffs:', error);
      res.status(500).json({ message: "Internal server error." });
    }
  });
  


//    =============================================================================

    
    router.get('/getStuAllocation',async(req,res)=>{
        try{
            const getQuery = `
            select stu_all.*,cls_all.cls_id,
            cls_all.sec_id,
            staff.staff_name,
            stu.stu_name,
            stu.stu_img,
            cls.cls_name,
            sec_name from students_allocation stu_all 
             inner join class_allocation cls_all on stu_all.cls_allocation_id = cls_all.cls_allocation_id
             inner join staffs_master staff on staff.staff_id = stu_all.staff_id
             inner join students_master stu on stu.stu_id = stu_all.stu_id 
             inner join class cls on cls.cls_id = cls_all.cls_id 
             inner join sections sec on sec.sec_id = cls_all.sec_id;`;
            const [results] = await db.query(getQuery);
        if (results.length == 0) {
            return res.status(404).json({ message: "Students allocation data not found." });
        } else {
          const convertData = results.map((result) => ({
            ...result,
            stu_img: `http://localhost:3001/uploads/${result.stu_img}` 
          }));
          return res.status(200).json(convertData);
        }

        }
        catch(err){
            console.log("Error fetching student allocation data :",err);
            return res.status(500).json({message:"Internal server error."})
        }
    });

    router.get('/getStuAllocationByFilteratin', async (req, res) => {
        try {
            const { cls_id, sec_id, academic_year } = req.query;
            console.log("Class Id:",cls_id)
            console.log("Academic Year :",academic_year)
    
            // Validate cls_id
            if (cls_id && isNaN(cls_id)) {
                return res.status(400).json({ message: "Invalid value for cls_id." });
            }
    
            // Validate sec_id
            if (sec_id && isNaN(sec_id)) {
                return res.status(400).json({ message: "Invalid value for sec_id." });
            }
    
            let query = `SELECT stu_all.*, cls_all.cls_id, cls_all.sec_id, staff.staff_name, stu.stu_name, stu.stu_img, cls.cls_name, sec.sec_name
                         FROM students_allocation stu_all
                         INNER JOIN class_allocation cls_all ON stu_all.cls_allocation_id = cls_all.cls_allocation_id
                         INNER JOIN staffs_master staff ON staff.staff_id = stu_all.staff_id
                         INNER JOIN students_master stu ON stu.stu_id = stu_all.stu_id
                         INNER JOIN class cls ON cls.cls_id = cls_all.cls_id
                         INNER JOIN sections sec ON sec.sec_id = cls_all.sec_id
                         WHERE 1=1`;
    
            if (cls_id) {
                query += ` AND cls_all.cls_id = ${cls_id}`;
            }
            if (sec_id) {
                query += ` AND cls_all.sec_id = ${sec_id}`;
            }
            if (academic_year) {
                query += ` AND stu_all.academic_year = "${academic_year}"`;
            }
    
            const [getResult] = await db.query(query);
            if (getResult.length === 0) {
                return res.status(404).json({ message: "Data Not Found" });
            } else {
                const convertData = getResult.map((data) => ({
                    ...data,
                    stu_img: `http://localhost:3001/uploads/${data.stu_img}`
                }));
                console.log("Data :",convertData)
                return res.status(200).json(convertData);
            }
        } catch (err) {
            console.log("Error fetching student allocation data :", err);
            return res.status(500).json({ message: "Internal server error." });
        }
    });
    
    

    router.put('/updateStuAllocation/:stu_allocation_id', async (req, res) => {
        try {
            const stu_allocation_id = req.params.stu_allocation_id;
            const { staff_id, stu_id, cls_allocation_id, roll_no, academic_year } = req.body;
            if (!staff_id || !stu_id || !cls_allocation_id || !roll_no || !academic_year) {
                return res.status(400).json({ message: "All fields are required" });
            }
            const checkQuery = `
                SELECT COUNT(*) AS count 
                FROM students_allocation 
                WHERE stu_id = ? AND roll_no = ? AND academic_year = ? AND stu_allocation_id != ?
            `;
            const [checkResults] = await db.query(checkQuery, [stu_id, roll_no, academic_year, stu_allocation_id]);
            if (checkResults[0].count > 0) {
                return res.status(400).json({ message: `Student with roll number ${roll_no} is already allocated for the academic year ${academic_year}` });
            }
            const updateQuery = `
                UPDATE students_allocation 
                SET staff_id = ?, stu_id = ?, cls_allocation_id=?, roll_no = ?, academic_year = ?, updated_at = ?
                WHERE stu_allocation_id = ?
            `;
            const updateParams = [staff_id, stu_id, cls_allocation_id, roll_no, academic_year, currentDate, stu_allocation_id];
            const [results] = await db.query(updateQuery, updateParams);
    
            if (results.affectedRows === 0) {
                return res.status(404).json({ message: "Student allocation not found or no changes made" });
            } else {
                return res.status(200).json({ message: "Student allocation updated successfully." });
            }
        } catch (err) {
            console.log("Error updating student allocation data:", err);
            return res.status(500).json({ message: "Internal server error." });
        }
    });

    router.delete('/deleteStuAllocation/:stu_allocation_id', async (req, res) => {
        try {
            const stu_allocation_id = req.params.stu_allocation_id;
            if (!stu_allocation_id) {
                return res.status(400).json({ message: "Student allocation ID is required." });
            }
            const [stuResults] = await db.query('SELECT stu_id FROM students_allocation WHERE stu_allocation_id = ?', [stu_allocation_id]);
            if (stuResults.length === 0) {
                return res.status(404).json({ message: "Student allocation data not found." });
            }
            
            const stu_id = stuResults[0].stu_id;
    
            // Check if there are other allocations for the same student
            const [allocations] = await db.query('SELECT COUNT(*) AS count FROM students_allocation WHERE stu_id = ? AND stu_allocation_id != ?', [stu_id, stu_allocation_id]);
            const otherAllocationsCount = allocations[0].count;
    
            // Delete the specific allocation
            const [deleteResults] = await db.query('DELETE FROM students_allocation WHERE stu_allocation_id = ?', [stu_allocation_id]);
            if (deleteResults.affectedRows === 0) {
                return res.status(404).json({ message: "Student allocation data not found or no data deleted." });
            }
    
            // If there are no other allocations for the same student, update isAllocated
            if (otherAllocationsCount === 0) {
                await db.query('UPDATE students_master SET isAllocated = 0 WHERE stu_id = ?', [stu_id]);
            }
    
            return res.status(200).json({ message: "Student allocation data deleted successfully." });
        } catch (err) {
            console.log("Error deleting student allocation data:", err);
            return res.status(500).json({ message: "Internal server error." });
        }
    });
    

      router.get('/getRollNo',async(req,res)=>{
        try{
            const getQuery = `select roll_no,academic_year from students_allocation`;
            const [results] = await db.query(getQuery);
            if(results.length === 0){
                return  res.status(404).json({message:"Data not found"})
            }else{
                return  res.status(200).json(results)
            }
        }
        catch(err){
            console.log("Error fetching Roll Number",err);
            return res.status(500).json({message:"Internal server error."})
        }
      })
    

    return router;
};
