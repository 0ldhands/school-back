const express = require('express');
const router = express.Router();
const multer = require('multer');
const mysql = require('mysql2/promise');

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

module.exports = (db) => {
    router.post('/saveTimeTable', upload.single('timetable'), async (req, res) => {
        try {
            console.log("Saving timetable...");

            if (!req.file) {
                return res.status(400).json({ message: "No file uploaded." });
            }

            const { cls_allocation_id, academic_year } = req.body;

            if (!cls_allocation_id || !academic_year) {
                return res.status(400).json({ message: "Missing required fields." });
            }

            const checkClassAllocationQuery = `
                SELECT * 
                FROM class_allocation 
                WHERE cls_allocation_id = ? AND academic_year = ?`;
            const [classAllocationResult] = await db.query(checkClassAllocationQuery, [cls_allocation_id, academic_year]);

            if (classAllocationResult.length === 0) {
                return res.status(404).json({ message: "Class allocation not found for the given academic year and cls_allocation_id." });
            }

            const checkTimeTableQuery = `
                SELECT * 
                FROM time_table 
                WHERE cls_allocation_id = ? AND academic_year = ?`;
            const [timeTableResult] = await db.query(checkTimeTableQuery, [cls_allocation_id, academic_year]);

            if (timeTableResult.length > 0) {
                return res.status(409).json({ message: "Time table already exists for the given class allocation and academic year." });
            }

            const currentDate = new Date().toISOString().slice(0, 19).replace('T', ' ');

            const insertQuery = `
                INSERT INTO time_table (time_tableimage, cls_allocation_id, academic_year, created_at) 
                VALUES (?, ?, ?, ?)`;
            await db.query(insertQuery, [req.file.buffer, cls_allocation_id, academic_year, currentDate]);

            return res.status(200).json({ message: "Time table saved successfully." });
        } catch (err) {
            console.error("Error saving time table:", err);
            return res.status(500).json({ message: "Internal server error." });
        }
    });

    router.get('/getTimeTable', async (req, res) => {
        console.log("getTimetable");

        try {
            const { cls_allocation_id, academic_year } = req.query;

            if (!cls_allocation_id || !academic_year) {
                return res.status(400).json({ message: "Missing required query parameters" });
            }

            const query = `SELECT * FROM time_table WHERE cls_allocation_id = ? AND academic_year = ?`;
            const [rows] = await db.query(query, [cls_allocation_id, academic_year]);

            if (rows.length === 0) {
                return res.status(404).json({ message: "No timetable data found" });
            }

            const convertData = rows.map((data) => ({
                ...data,
                time_tableimage: data.time_tableimage.toString('base64')
            }));

            res.status(200).json(convertData);
            // console.log(convertData);

        } catch (err) {
            console.error("Error fetching timetable data:", err);
            return res.status(500).json({ message: "Internal server error" });
        }
    });

    router.delete('/deleteTimeTable', async (req, res) => {
        try {
            const { id } = req.query;

            if (!id) {
                return res.status(400).json({ message: "Missing required query parameter: id" });
            }

            const deleteQuery = `DELETE FROM time_table WHERE t_table_id = ?`;
            const [result] = await db.query(deleteQuery, [id]);

            if (result.affectedRows === 0) {
                return res.status(404).json({ message: "Timetable entry not found" });
            }

            return res.status(200).json({ message: "Timetable entry deleted successfully" });
        } catch (err) {
            console.error("Error deleting timetable entry:", err);
            return res.status(500).json({ message: "Internal server error" });
        }
    });

    return router;
};
