const express = require("express");
const router = express.Router();
const moment = require("moment");
const currentDate = moment().format("YYYY-MM-DD HH:mm:ss");

module.exports = (db) => {
    router.post('/postStaffAllocation', async (req, res) => {
        try {
            const { staff_id, sub_id, academic_year } = req.body;
    
            if (!staff_id) {
                return res.status(400).json({ message: "Staff ID required" });
            }
            if (!sub_id) {
                return res.status(400).json({ message: "Subject ID required" });
            }
            if (!academic_year) {
                return res.status(400).json({ message: "Academic year required" });
            }
    
            const connection = await db.getConnection();
            await connection.beginTransaction();
    
            try {
                // Check if the subject is already allocated for the given academic year
                const checkQuery = `SELECT COUNT(*) as count FROM staff_allocation WHERE sub_id = ? AND academic_year = ?`;
                const [checkResult] = await connection.query(checkQuery, [sub_id, academic_year]);
    
                if (checkResult[0].count > 0) {
                    await connection.rollback();
                    return res.status(400).json({ message: `Given Subject already allocated to staff for the academic year ${academic_year}` });
                }
    
                // Get the maximum academic year in the database
                const maxAcademicYearQuery = `SELECT MAX(academic_year) as max_year FROM staff_allocation`;
                const [maxAcademicYearResult] = await connection.query(maxAcademicYearQuery);
    
                if (maxAcademicYearResult[0].max_year && maxAcademicYearResult[0].max_year > academic_year) {
                    await connection.rollback();
                    return res.status(400).json({ message: `Cannot allocate to a past academic year ${academic_year} when there is a future allocation for ${maxAcademicYearResult[0].max_year}` });
                }
    
                // Mark previous allocations as expired if the new academic year is higher
                if (maxAcademicYearResult[0].max_year && maxAcademicYearResult[0].max_year < academic_year) {
                    const expirePrevYearsAllocationsQuery = `
                        UPDATE staff_allocation 
                        SET isExpired = 1 
                        WHERE academic_year < ? AND isExpired = 0`;
                    await connection.query(expirePrevYearsAllocationsQuery, [academic_year]);
                }
    
                // Insert the new allocation
                const insertQuery = `INSERT INTO staff_allocation (staff_id, sub_id, academic_year, isExpired, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)`;
                const [insertResult] = await connection.query(insertQuery, [staff_id, sub_id, academic_year, 0, currentDate, currentDate]);
    
                if (insertResult.affectedRows === 1) {
                    await connection.commit();
                    return res.status(200).json({ message: "Staff and subject allocated successfully." });
                } else {
                    await connection.rollback();
                    return res.status(400).json({ message: "Failed to allocate staff and subject." });
                }
            } catch (err) {
                await connection.rollback();
                console.log("Internal server error:", err);
                return res.status(500).json({ message: "Internal server error." });
            } finally {
                connection.release();
            }
        } catch (err) {
            console.log("Error saving staff allocation data:", err);
            return res.status(500).json({ message: "Internal server error." });
        }
    });
    
    router.post('/postclassteacher', async (req, res) => {
        const { staff_id, cls_id, cls_allocation_id, academic_year } = req.body;
    
        if (!staff_id) {
            return res.status(400).json({ message: "Staff ID required" });
        }
        if (!cls_id) {
            return res.status(400).json({ message: "Class ID required" });
        }
        if (!cls_allocation_id) {
            return res.status(400).json({ message: "Section ID required" });
        }
        if (!academic_year) {
            return res.status(400).json({ message: "Academic year required" });
        }
    
        try {
            const connection = await db.getConnection();
            await connection.beginTransaction();
    
            try {
                const insertQuery = `INSERT INTO class_teachers (staff_id, cls_id, cls_allocation_id, academic_year) VALUES (?, ?, ?, ?)`;
                const [insertResult] = await connection.query(insertQuery, [staff_id, cls_id, cls_allocation_id, academic_year]);
    
                if (insertResult.affectedRows === 1) {
                    await connection.commit();
                    return res.status(200).json({ message: "Staff and class allocated successfully." });
                } else {
                    await connection.rollback();
                    
                    return res.status(400).json({ message: "Failed to allocate staff and class." });
                }
            } catch (err) {
                await connection.rollback();
                console.log("Internal server error:", err);
                return res.status(500).json({ message: "Internal server error." });
            } finally {
                connection.release();
            }
        } catch (err) {
            console.log("Error saving staff allocation data:", err);
            return res.status(500).json({ message: "Internal server error." });
        }
    });    

    router.get('/getclassteach', async (req, res) => {
        try {
            const getquery = `select class_teachers.*,staffs_master.staff_name from class_teachers inner join staffs_master where class_teachers.staff_id = staffs_master.staff_id `;
            const [results] = await db.query(getquery);
            if (results.length == 0) {
                return res.status(404).json({ message: "Staff and Subject allocated data not found." });
            } else {
                return res.status(200).json(results);
            }
        } catch (err) {
            console.log("Error Fetching staff and Subject allocated data:", err);
            return res.status(500).json({ message: "Internal server error." });
        }
    });
    
    router.get('/getStaffAllocation',async(req,res)=>{
        try{
           const getQuery = `select 
           staff_all.staff_allocation_id,
           staff_all.staff_id,
           staff_all.sub_id,
           staff_all.academic_year,
           staff.staff_name,
           staff.staff_img,
           sub.sub_name,
           cls.cls_name,
           cls.cls_id,
           sec.sec_name,
           cls_all.cls_allocation_id
           from staff_allocation staff_all
           inner join staffs_master staff on staff_all.staff_id = staff.staff_id
           inner join subjects sub on sub.sub_id = staff_all.sub_id
           inner join class_allocation cls_all on cls_all.cls_allocation_id = sub.cls_allocation_id
           inner join class cls on cls.cls_id = cls_all.cls_id
           inner join sections sec on sec.sec_id = cls_all.sec_id
           `;
           const [results] = await db.query(getQuery);
          if (results.length == 0) {
            return res.status(404).json({ message: "Staff and Subject allocated data not found." });
          } else {
            const convertData = results.map((data)=>({
                ...data,
                staff_img : `http://localhost:3001/uploads/${data.staff_img}`
            }))
            return res.status(200).json(convertData);
          }
        }
        catch(err){
            console.log("Error Fetching staff and Subject allocated data :",err);
            return res.status(500).json({message:"Internal server error."})
        }
    });

    

    router.put('/updateStaffAllocation/:staff_allocation_id', async (req, res) => {
        try {
            const staff_allocation_id = req.params.staff_allocation_id;
            const { staff_id, sub_id, academic_year } = req.body;
    
            if (!staff_allocation_id) {
                return res.status(400).json({ message: "Staff Allocation ID is required" });
            }
            if (!staff_id) {
                return res.status(400).json({ message: "Staff ID is required" });
            }
            if (!sub_id) {
                return res.status(400).json({ message: "Subject ID is required" });
            }
            if (!academic_year) {
                return res.status(400).json({ message: "Academic year is required" });
            }
    
            const connection = await db.getConnection();
            await connection.beginTransaction();
    
            try {
                // Update the current allocation
                const updateQuery = `UPDATE staff_allocation SET staff_id = ?, sub_id = ?, academic_year = ?, updated_at = ? WHERE staff_allocation_id = ?`;
                const [updateResult] = await connection.query(updateQuery, [staff_id, sub_id, academic_year, new Date(), staff_allocation_id]);
    
                if (updateResult.affectedRows === 1) {
                    // Determine the highest academic year
                    const maxAcademicYearQuery = `SELECT MAX(academic_year) AS max_year FROM staff_allocation`;
                    const [maxAcademicYearResult] = await connection.query(maxAcademicYearQuery);
                    const maxAcademicYear = maxAcademicYearResult[0].max_year;
    
                    // Determine if the current academic year is the highest
                    if (academic_year >= maxAcademicYear) {
                        // Mark all lower years as expired
                        const expireQuery = `UPDATE staff_allocation SET isExpired = 1 WHERE academic_year < ?`;
                        await connection.query(expireQuery, [academic_year]);
    
                        // Mark the current year as not expired
                        const unexpireQuery = `UPDATE staff_allocation SET isExpired = 0 WHERE academic_year = ?`;
                        await connection.query(unexpireQuery, [academic_year]);
                    } else {
                        // Mark the current academic year as expired
                        const expireQuery = `UPDATE staff_allocation SET isExpired = 1 WHERE academic_year = ?`;
                        await connection.query(expireQuery, [academic_year]);
    
                        // Unexpire records if all academic years are the same
                        const allYearsQuery = `SELECT COUNT(DISTINCT academic_year) AS unique_years FROM staff_allocation`;
                        const [allYearsResult] = await connection.query(allYearsQuery);
    
                        if (allYearsResult[0].unique_years === 1) {
                            const unexpireAllQuery = `UPDATE staff_allocation SET isExpired = 0`;
                            await connection.query(unexpireAllQuery);
                        }
                    }
    
                    await connection.commit();
                    return res.status(200).json({ message: "Staff allocation updated successfully." });
                } else {
                    await connection.rollback();
                    return res.status(400).json({ message: "Failed to update staff allocation." });
                }
            } catch (err) {
                await connection.rollback();
                console.log("Internal server error:", err);
                return res.status(500).json({ message: "Internal server error." });
            } finally {
                connection.release();
            }
        } catch (err) {
            console.log("Error updating staff allocation data:", err);
            return res.status(500).json({ message: "Internal server error." });
        }
    });
    
    router.delete('/deleteStaffAllocation/:staff_allocation_id', async (req, res) => {
        try {
            const staff_allocation_id = req.params.staff_allocation_id;
            if (!staff_allocation_id) {
                return res.status(400).json({ message: "Staff Allocation ID is required" });
            }
            
            const connection = await db.getConnection();
            await connection.beginTransaction();
            
            try {
                // Delete the specified staff allocation
                const deleteQuery = `DELETE FROM staff_allocation WHERE staff_allocation_id = ?`;
                const [deleteResults] = await connection.query(deleteQuery, [staff_allocation_id]);
    
                if (deleteResults.affectedRows === 1) {
                    // Determine the highest remaining academic year
                    const maxAcademicYearQuery = `SELECT MAX(academic_year) AS max_year FROM staff_allocation`;
                    const [maxAcademicYearResult] = await connection.query(maxAcademicYearQuery);
                    const maxAcademicYear = maxAcademicYearResult[0].max_year;
    
                    // Update the isExpired status based on the highest academic year
                    if (maxAcademicYear) {
                        const expireQuery = `UPDATE staff_allocation SET isExpired = (academic_year < ?)`;
                        await connection.query(expireQuery, [maxAcademicYear]);
                    }
    
                    await connection.commit();
                    return res.status(200).json({ message: "Staff and subject deleted successfully" });
                } else {
                    await connection.rollback();
                    return res.status(400).json({ message: "Failed to delete staff and subject" });
                }
            } catch (err) {
                await connection.rollback();
                console.error("Error deleting staff and subject allocation:", err);
                return res.status(500).json({ message: "Internal server error" });
            } finally {
                await connection.release();
            }
        } catch (err) {
            console.log("Error deleting staff allocation data:", err);
            return res.status(500).json({ message: "Internal server error." });
        }
    });
    

    router.get('/getStaffSubAndClsData/:staff_id',async(req,res)=>{
        try{
            const staff_id = req.params.staff_id;
           const getQuery = `select 
           staff_all.staff_allocation_id,
           staff_all.staff_id,
           staff_all.sub_id,
           staff_all.academic_year,
           staff.staff_name,
           staff.staff_img,
           sub.sub_name,
           cls.cls_name,
           cls.cls_id,
           sec.sec_name,
           cls_all.cls_allocation_id
           from staff_allocation staff_all
           inner join staffs_master staff on staff_all.staff_id = staff.staff_id
           inner join subjects sub on sub.sub_id = staff_all.sub_id
           inner join class_allocation cls_all on cls_all.cls_allocation_id = sub.cls_allocation_id
           inner join class cls on cls.cls_id = cls_all.cls_id
           inner join sections sec on sec.sec_id = cls_all.sec_id
           where staff_all.isExpired = 0 and staff_all.staff_id = ?
           `;
           const [results] = await db.query(getQuery,[staff_id]);
          if (results.length == 0) {
            return res.status(404).json({ message: "Staff Subject and class data not found." });
          } else {
            const convertData = results.map((data)=>({
                ...data,
                staff_img : `http://localhost:3001/uploads/${data.staff_img}`
            }))
            return res.status(200).json(convertData);
          }
        }
        catch(err){
            console.log("Error Fetching staff and Subject allocated data :",err);
            return res.status(500).json({message:"Internal server error."})
        }
    });
    return router;
}
