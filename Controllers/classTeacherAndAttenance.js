const express = require('express');
const router = express.Router();
const moment = require('moment');
const currentDate = moment().format('YYYY-MM-DD HH:mm:ss');

module.exports = (db) => {

   
  
    router.get('/classstudents/:staff_id', async (req, res) => {
        const { staff_id } = req.params;
    
        console.log(`Fetching students for staff_id: ${staff_id}`);
    
        try {
            const getQuery = `
                SELECT *
                FROM students_master
                WHERE staff_id = ?
            `;
    
            const [results] = await db.query(getQuery, [staff_id]);
    
            if (results.length === 0) {
                console.warn(`No students found for staff_id: ${staff_id}`);
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
    

    
    
    return router;
};
