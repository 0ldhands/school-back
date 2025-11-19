const express = require('express');
const router = express.Router();
const moment = require('moment');
const currentDate = moment().format("YYYY-MM-DD HH:mm:ss");

module.exports = (db) => {

    router.get("/getClass", async (req, res) => {
        try {
          const getQuery = `select * from class`;
          const [results] = await db.query(getQuery);
          if (results.length == 0) {
            return res.status(404).json({ message: "Class data not found." });
          } else {
            return res.status(200).json(results);
          }
        } catch (error) {
          console.error("Error fetching class data:", error);
          return res.status(500).json({ message: "Internal server error." });
        }
      });


      router.get(`/getClass/:classId`,async(req,res)=>{
        try{
          const class_id =req.params.classId
          console.log(class_id);
          const getQuery= `select * from class where cls_id =?`
          const [results]= await db.query(getQuery,class_id)
          if (results.length == 0) {
            return res.status(404).json({ message: " data not found." });
          } else {
           
            
            return res.status(200).json(results);
          }
        } catch (error) {
          console.error("Error fetching data:", error);
          return res.status(500).json({ message: "Internal server error." });
        }
        
        })
      
    router.get("/getSection", async (req, res) => {
        try {
          const getQuery = `select * from sections`;
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

      router.post('/saveClassAndSecAllocation', async (req, res) => {
        try {
            const { cls_id, sec_ids, academic_year } = req.body;
    
            if (!cls_id) {
                return res.status(400).json({ message: "Class ID is required" });
            }
            if (!Array.isArray(sec_ids) || sec_ids.length === 0) {
                return res.status(400).json({ message: "At least one Section ID is required" });
            }
            if (!academic_year) {
                return res.status(400).json({ message: "Academic Year is required" });
            }
    
            const alreadyAllocatedSections = [];
    
            for (const sec_id of sec_ids) {
                const checkQuery = `
                    SELECT COUNT(*) AS count, cls.cls_name, sec.sec_name 
                    FROM class_allocation cls_all 
                    INNER JOIN class cls ON cls.cls_id = cls_all.cls_id 
                    INNER JOIN sections sec ON sec.sec_id = cls_all.sec_id 
                    WHERE cls_all.cls_id = ? AND cls_all.sec_id = ? AND academic_year = ?
                `;
                const [checkResults] = await db.query(checkQuery, [cls_id, sec_id, academic_year]);
    
                if (checkResults[0].count > 0) {
                    alreadyAllocatedSections.push(checkResults[0].sec_name);
                } else {
                    const saveQuery = `INSERT INTO class_allocation (cls_id, sec_id, academic_year, created_at) VALUES (?, ?, ?, ?)`;
                    const [results] = await db.query(saveQuery, [cls_id, sec_id, academic_year, currentDate]);
    
                    if (results.affectedRows !== 1) {
                        return res.status(500).json({ message: `Failed to allocate section ${sec_id} for class ${cls_id}` });
                    }
                }
            }
    
            if (alreadyAllocatedSections.length > 0) {
                return res.status(400).json({ 
                    message: `Section(s) ${alreadyAllocatedSections.join(', ')} are already allocated for the class in the academic year ${academic_year}. Please try again without the existing sections ${alreadyAllocatedSections.join(', ')} for the class in this academic year ${academic_year}.`
                });
            }
    
            return res.status(200).json({ message: `Successfully allocated sections for the class in the academic year ${academic_year}` });
    
        } catch (err) {
            console.log("Error saving class allocation data:", err);
            return res.status(500).json({ message: "Internal server error." });
        }
    });

    router.get('/getClsAndSecAllocation', async (req, res) => {
        try {
            const { cls_id,academic_year } = req.query;
            let getQuery = `
                SELECT cls_all.*, cls.cls_name, sec.sec_name 
                FROM class_allocation cls_all 
                INNER JOIN class cls ON cls.cls_id = cls_all.cls_id 
                INNER JOIN sections sec ON sec.sec_id = cls_all.sec_id
            `;
            const queryParams = [];
            
            if (cls_id) {
                getQuery += ` WHERE cls_all.cls_id = ?`;
                queryParams.push(cls_id);
            }

            if (academic_year) {
                getQuery += ` WHERE cls_all.academic_year = ?`;
                queryParams.push(academic_year);
            }

            const [results] = await db.query(getQuery, queryParams);

            if (results.length == 0) {
                return res.status(404).json({ message: "Class allocation data not found." });
            } else {
                return res.status(200).json(results);
            }
        } catch (err) {
            console.log("Error getting class allocation data:", err);
            return res.status(500).json({ message: "Internal server error." });
        }
    });

    router.get('/getClsAndSecAllocationByClsId', async (req, res) => {
        try {
            const { cls_id } = req.query;
            let getQuery = `
                SELECT cls_all.cls_allocation_id,cls_all.cls_id,sec.sec_name,sec.sec_id
                FROM class_allocation cls_all
                INNER JOIN sections sec ON sec.sec_id = cls_all.sec_id WHERE cls_all.cls_id = ?
            `;
            const [results] = await db.query(getQuery, [cls_id]);

            if (results.length == 0) {
                return res.status(404).json({ message: "Class allocation data not found." });
            } else {
                return res.status(200).json(results);
            }
        } catch (err) {
            console.log("Error getting class allocation data:", err);
            return res.status(500).json({ message: "Internal server error." });
        }
    });

    
     

    router.put('/updateClassAndSecAllocation/:clsAllocationId', async (req, res) => {
        console.log("update");
    
        try {
            const cls_allocation_id = req.params.clsAllocationId;
            const { cls_id, sec_ids, academic_year } = req.body; // Changed sec_id to sec_ids to match the frontend
            const currentDate = moment().format('YYYY-MM-DD HH:mm:ss');
            
            if (!cls_id) {
                return res.status(400).json({ message: "Class ID is required" });
            }
            if (!sec_ids || !sec_ids.length) {
                return res.status(400).json({ message: "At least one Section ID is required" });
            }
            if (!academic_year) {
                return res.status(400).json({ message: "Academic Year is required" });
            }
    
            // Check for existing allocations
            const checkQuery = `
                SELECT COUNT(*) AS count, cls.cls_name, sec.sec_name 
                FROM class_allocation cls_all 
                INNER JOIN class cls ON cls.cls_id = cls_all.cls_id 
                INNER JOIN sections sec ON sec.sec_id = cls_all.sec_id 
                WHERE cls_all.cls_id = ? AND cls_all.sec_id IN (?) AND cls_all.academic_year = ? AND cls_all.cls_allocation_id != ?
            `;
            const [checkResults] = await db.query(checkQuery, [cls_id, sec_ids, academic_year, cls_allocation_id]);
    
            if (checkResults[0].count > 0) {
                return res.status(400).json({ 
                    message: `Some sections are already allocated for the class ${checkResults[0].cls_name} in the academic year ${academic_year}.`
                });
            }
    
            // Update the allocation
            const updateQuery = `UPDATE class_allocation SET cls_id = ?, sec_id = ?, academic_year = ?, updated_at = ? WHERE cls_allocation_id = ?`;
            const [results] = await db.query(updateQuery, [cls_id, sec_ids[0], academic_year, currentDate, cls_allocation_id]);
    
            if (results.affectedRows !== 1) {
                return res.status(500).json({ message: `Failed to update the allocation for class ${cls_id}` });
            }
            res.status(200).json({ message: `Successfully updated the allocation for class ${cls_id} in the academic year ${academic_year}` });
        } catch (err) {
            console.log("Error updating class allocation data:", err);
            return res.status(500).json({ message: "Internal server error." });
        }
    });
    
    
    router.delete('/deleteClassAndSecAllocation/:clsAllocationId',async(req,res)=>{
        try{
            const cls_allocation_id = req.params.clsAllocationId;
            if(!cls_allocation_id){
                return res.status(400).json({message:"Class allocation ID is required."})
            }
            const deleteQuery = `delete from class_allocation where cls_allocation_id = ?`;
            const [results] = await db.query(deleteQuery,[cls_allocation_id]);
            if(results.affectedRows === 0){
                return res.status(404).json({message:"Class allocation data not found or no data deleted"})
            }else{
                return res.status(200).json({ message: "Class allocation data deleted successfully." }); 
            }
    
        }catch(err){
            console.log("Error delete Class allocation data :",err);
            return res.status(500).json({message:"Internal server error."})
        }
      })
    

    return router;
};
