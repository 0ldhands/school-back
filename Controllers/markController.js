const express = require('express');
const router = express.Router();
const moment = require('moment');
const currentDate = moment().format("YYYY-MM-DD HH:mm:ss");

module.exports = (db) => {
    router.post('/', async (req, res) => {
        try {
            const { exam_id, sub_id, staff_id, roll_no, mark, academic_year, exam_date } = req.body;

            if (!exam_id) {
                return res.status(400).json({ message: "Exam ID required" });
            }
            if (!sub_id) {
                return res.status(400).json({ message: "Subject ID required" });
            }
            if (!staff_id) {
                return res.status(400).json({ message: "Staff ID required" });
            }
            if (!roll_no) {
                return res.status(400).json({ message: "Roll Number required" });
            }
            if (!mark) {
                return res.status(400).json({ message: "Mark required" });
            }
            if (!academic_year) {
                return res.status(400).json({ message: "Academic Year required" });
            }
            if (!exam_date) {
                return res.status(400).json({ message: "Exam Date required" });
            }
            const checkStuData = `SELECT COUNT(*) as count FROM students_allocation WHERE roll_no = ? AND academic_year = ?`;
            const [checkStuDataRes] = await db.query(checkStuData, [roll_no, academic_year]);

            if (checkStuDataRes[0].count === 1) {
                const checkDuplicate = `
                    SELECT COUNT(*) as count 
                    FROM exam_mark 
                    WHERE roll_no = ? 
                      AND exam_id = ? 
                      AND sub_id = ? 
                      AND academic_year = ? 
                      AND MONTH(exam_date) = MONTH(?) 
                      AND YEAR(exam_date) = YEAR(?)
                `;
                const [checkDuplicateRes] = await db.query(checkDuplicate, [roll_no, exam_id, sub_id, academic_year, exam_date, exam_date]);

                if (checkDuplicateRes[0].count > 0) {
                    return res.status(400).json({
                        message: `Duplicate record: Roll number ${roll_no} has already been assigned marks for exam ID ${exam_id} and subject ID ${sub_id} in the academic year ${academic_year} for the month of ${moment(exam_date).format("MMMM YYYY")}.`
                    });
                } else {
                    const insertQuery = `INSERT INTO exam_mark (exam_id, sub_id, staff_id, roll_no, mark, academic_year, exam_date, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
                    await db.query(insertQuery, [exam_id, sub_id, staff_id, roll_no, mark, academic_year, exam_date, currentDate]);

                    return res.status(200).json({ message: "Exam mark data saved successfully." });
                }
            } else {
                return res.status(400).json({ message: `Given roll number ${roll_no} does not exist for the academic year ${academic_year}.` });
            }
        } catch (err) {
            console.log("Error saving exam mark data:", err);
            return res.status(500).json({ message: "Internal server error." });
        }
    });

    return router;
};
