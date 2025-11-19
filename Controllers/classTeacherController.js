const express = require("express");
const router = express.Router();
const moment = require('moment');
const currentDate = moment().format("YYYY-MM-DD HH:mm:ss");
module.exports = (db) =>{
    router.post('/saveClassTeacher', async (req, res) => {
        try {
            const { cls_allocation_id, staff_id, academic_year } = req.body;
    
            if (!cls_allocation_id) {
                return res.status(400).json({ message: "Section IDs are required." });
            }
            if (!staff_id) {
                return res.status(400).json({ message: 'Staff Id required.' });
            }
            if (!academic_year) {
                return res.status(400).json({ message: "Academic year required" });
            }
    
            const connection = await db.getConnection();
            await connection.beginTransaction();
            try {
                const checkAllocationQuery = `SELECT COUNT(*) as count FROM class_allocation WHERE cls_allocation_id = ? AND academic_year = ?`;
                const [allocationResult] = await connection.query(checkAllocationQuery, [cls_allocation_id, academic_year]);
    
                if (allocationResult[0].count === 0) {
                    return res.status(400).json({ message: `Class allocation for the given section and academic year does not exist.` });
                }
    
                const checkExistingQuery = `SELECT COUNT(*) as count FROM cls_teacher WHERE staff_id = ? AND academic_year = ?`;
                const checkExistingResult = await connection.query(checkExistingQuery, [staff_id, academic_year]);
                if (checkExistingResult[0].count > 0) {
                    return res.status(400).json({ message: `This staff member is already allocated as a class teacher for another class in the academic year ${academic_year}` });
                }
    
                const checkQuery = `SELECT COUNT(*) as count FROM cls_teacher WHERE cls_allocation_id = ? AND academic_year = ?`;
                const insertQuery = `INSERT INTO cls_teacher (cls_allocation_id, staff_id, academic_year, created_at) VALUES (?, ?, ?, ?)`;
                const [checkResult] = await connection.query(checkQuery, [cls_allocation_id, academic_year]);
                if (checkResult[0].count > 0) {
                    return res.status(400).json({ message: `Given section already has a class teacher allocated for the ${academic_year} year` });
                }
    
                const currentDate = moment().format("YYYY-MM-DD HH:mm:ss");
                const [insertResult] = await connection.query(insertQuery, [cls_allocation_id, staff_id, academic_year, currentDate]);
                if (insertResult.affectedRows === 1) {
                    await connection.commit();
                    return res.status(200).json({ message: "Class Teacher allocated successfully." });
                } else {
                    await connection.rollback();
                    return res.status(400).json({ message: "Failed to update class teacher allocation." });
                }
            }
            catch (err) {
                await connection.rollback();
                console.log("Error saving class teacher data:", err);
                return res.status(500).json({ message: "Internal server error." });
            }
            finally {
                await connection.release();
            }
        }
        catch (err) {
            console.log("Error saving class teacher data", err);
            res.status(500).json({ message: "Internal server error." });
        }
    });
    
   

    router.get('/getClassTeachers', async (req, res) => {
        try {
            const connection = await db.getConnection();
    
            const query = `
                SELECT 
                    cls_teach.cls_teacher_id,
                    cls_teach.cls_allocation_id,
                    cls_teach.staff_id,
                    cls_teach.academic_year,
                    cls.cls_name,
                    sec.sec_name,
                    staff.staff_name,
                    staff.staff_img
                FROM 
                    cls_teacher cls_teach 
                    INNER JOIN class_allocation cls_all ON cls_all.cls_allocation_id = cls_teach.cls_allocation_id
                    INNER JOIN staffs_master staff ON staff.staff_id = cls_teach.staff_id
                    INNER JOIN class cls ON cls.cls_id = cls_all.cls_id
                    INNER JOIN sections sec ON sec.sec_id = cls_all.sec_id
            `;
    
            const [rows] = await connection.query(query);
    
            await connection.release();
    
            // Check if any data is retrieved
            if (rows.length === 0) {
                return res.status(404).json({ message: "No class teacher data found." });
            }
    
            res.status(200).json(rows);
        } catch (error) {
            console.error("Error fetching class teachers:", error);
            res.status(500).json({ message: "Internal server error." });
        }
    });
    


    router.put('/updateClassTeacher/:cls_teacher_id', async (req, res) => {
        try {
            const cls_teacher_id = req.params.cls_teacher_id;
            const { cls_allocation_id, staff_id, academic_year } = req.body;
    
            if (!cls_allocation_id) {
                return res.status(400).json({ message: "Section IDs are required." });
            }
            if (!staff_id) {
                return res.status(400).json({ message: 'Staff Id required.' });
            }
            if (!academic_year) {
                return res.status(400).json({ message: "Academic year required" });
            }
    
            const connection = await db.getConnection();
            await connection.beginTransaction();
    
            try {
                const checkAllocationQuery = `SELECT COUNT(*) as count FROM class_allocation WHERE cls_allocation_id = ? AND academic_year = ?`;
                const [allocationResult] = await connection.query(checkAllocationQuery, [cls_allocation_id, academic_year]);
    
                if (allocationResult[0].count === 0) {
                    return res.status(400).json({ message: `Class allocation for the given section and academic year does not exist.` });
                }
                const checkExistingQuery = `SELECT COUNT(*) as count FROM cls_teacher WHERE staff_id = ? AND academic_year = ? AND cls_teacher_id != ?`;
                const checkExistingResult = await connection.query(checkExistingQuery, [staff_id, academic_year, cls_teacher_id]);
    
                if (checkExistingResult[0].count > 0) {
                    return res.status(400).json({ message: `This staff member is already allocated as a class teacher for another class in the academic year ${academic_year}` });
                }
                const updateQuery = `UPDATE cls_teacher SET cls_allocation_id = ?, staff_id = ?, academic_year = ?, updated_at = ? WHERE cls_teacher_id = ?`;
                const currentDate = moment().format("YYYY-MM-DD HH:mm:ss");
                const [updateResult] = await connection.query(updateQuery, [cls_allocation_id, staff_id, academic_year, currentDate, cls_teacher_id]);
    
                if (updateResult.affectedRows === 1) {
                    await connection.commit();
                    return res.status(200).json({ message: "Class Teacher updated successfully." });
                } else {
                    await connection.rollback();
                    return res.status(400).json({ message: "Failed to update class teacher." });
                }
            }
            catch (err) {
                await connection.rollback();
                console.log("Error updating class teacher:", err);
                return res.status(500).json({ message: "Internal server error." });
            }
            finally {
                await connection.release();
            }
    
        }
        catch (err) {
            console.log("Error updating class teacher", err);
            res.status(500).json({ message: "Internal server error." });
        }
    });
    


    router.delete('/deleteClassTeacher/:cls_teacher_id', async (req, res) => {
        try {
            const cls_teacher_id = req.params.cls_teacher_id;

            const connection = await db.getConnection();
            await connection.beginTransaction();

            try {
                const deleteQuery = `DELETE FROM cls_teacher WHERE cls_teacher_id = ?`;
                const [deleteResult] = await connection.query(deleteQuery, [cls_teacher_id]);

                if(deleteResult.affectedRows === 1){
                    await connection.commit();
                    return res.status(200).json({message:"Class Teacher deleted successfully."})
                } else {
                    await connection.rollback();
                    return res.status(400).json({ message: "Failed to delete class teacher." });
                }
            }
            catch(err){
                await connection.rollback();
                console.log("Error deleting class teacher:", err);
                return res.status(500).json({message:"Internal server error."})
            }
            finally{
                await connection.release();
            }

        }
        catch(err){
            console.log("Error deleting class teacher", err);
            res.status(500).json({message:"Internal server error."})
        }
    })


    return router;
}
