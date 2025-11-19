const express = require("express");
const router = express.Router();
const moment = require("moment");
const currentDate = moment().format('YYYY-MM-DD HH:mm:ss');

module.exports = (db) => {

    router.post('/saveSubjects', async (req, res) => {
        try {
            const { cls_allocation_id, sub_names } = req.body;

            if (!cls_allocation_id) {
                return res.status(400).json({ message: "Class and Section are required" });
            }

            if (!sub_names || sub_names.length === 0) {
                return res.status(400).json({ message: "At least one subject is required" });
            }

            const uniqueSubNames = new Set(sub_names);
            if (uniqueSubNames.size !== sub_names.length) {
                return res.status(400).json({ message: "Duplicate subjects found in the provided list" });
            }

            const connection = await db.getConnection();
            await connection.beginTransaction();
            try {
                const checkQuery = `SELECT sub_name FROM subjects WHERE cls_allocation_id = ?`;
                const saveQuery = `INSERT INTO subjects (cls_allocation_id, sub_name, created_at) VALUES (?, ?, ?)`;
                const [existingSubjects] = await connection.query(checkQuery, [cls_allocation_id]);
                const existingSubjectNames = existingSubjects.map(row => row.sub_name);

                for (const sub_name of sub_names) {
                    if (existingSubjectNames.includes(sub_name)) {
                        await connection.rollback();
                        return res.status(400).json({ message: `Subject '${sub_name}' already exists for the given class and section` });
                    }
                }

                for (const sub_name of sub_names) {
                    await connection.query(saveQuery, [cls_allocation_id, sub_name, currentDate]);
                }

                await connection.commit();
                return res.status(200).json({ message: "Subjects saved successfully" });
            } catch (err) {
                await connection.rollback();
                console.error("Error saving subjects:", err);
                return res.status(500).json({ message: "Internal server error" });
            } finally {
                connection.release();
            }
        } catch (err) {
            console.error("Error saving subjects:", err);
            return res.status(500).json({ message: "Internal server error" });
        }
    });

    router.get('/getSubjects',async(req,res)=>{
        try{
           const getQuery = `select sub.sub_id, sub.cls_allocation_id,sub.sub_name,cls.cls_name,sec.sec_name from subjects sub inner join class_allocation cls_all on cls_all.cls_allocation_id = sub.cls_allocation_id
           inner join class cls on cls.cls_id = cls_all.cls_id inner join sections sec on sec.sec_id = cls_all.sec_id
           `;
           const [results] = await db.query(getQuery);
          if (results.length == 0) {
            return res.status(404).json({ message: "Subject data not found." });
          } else {
            
            return res.status(200).json(results);
          }
        }
        catch(err){
            console.log("Error Fetching Subject data :",err);
            return res.status(500).json({message:"Internal server error."})
        }
    });

    router.get('/getSubjects/:cls_allocation_id',async(req,res)=>{
        try{
            const cls_allocation_id = req.params.cls_allocation_id;
           const getQuery = `select sub.sub_id, sub.cls_allocation_id,sub.sub_name,cls.cls_name,sec.sec_name from subjects sub inner join class_allocation cls_all on cls_all.cls_allocation_id = sub.cls_allocation_id
           inner join class cls on cls.cls_id = cls_all.cls_id inner join sections sec on sec.sec_id = cls_all.sec_id
           where sub.cls_allocation_id = ?
           `;
           const [results] = await db.query(getQuery,[cls_allocation_id]);
          if (results.length == 0) {
            return res.status(404).json({ message: "Subject data not found." });
          } else {
            
            return res.status(200).json(results);
          }
        }
        catch(err){
            console.log("Error Fetching Subject data :",err);
            return res.status(500).json({message:"Internal server error."})
        }
    });

    router.put('/updateSubjects/:sub_id', async (req, res) => {
        try {
            const subId = req.params.sub_id;
            const { cls_allocation_id, sub_name } = req.body;

            if (!cls_allocation_id) {
                return res.status(400).json({ message: "Class and Section are required" });
            }

            if (!sub_name) {
                return res.status(400).json({ message: "Subject is required" });
            }

            const connection = await db.getConnection();
            await connection.beginTransaction();

            try {
                const checkQuery = `SELECT sub_name FROM subjects WHERE cls_allocation_id = ?`;
                const updateQuery = `UPDATE subjects SET sub_name = ?, updated_at = ? WHERE sub_id = ?`;

                const [existingSubjects] = await connection.query(checkQuery, [cls_allocation_id]);

                if (existingSubjects.some(subject => subject.sub_name === sub_name)) {
                    await connection.rollback();
                    return res.status(400).json({ message: `Subject '${sub_name}' already exists for the given class and section` });
                }

                const [updateResults] = await connection.query(updateQuery, [sub_name, currentDate, subId]);

                if (updateResults.affectedRows === 1) {
                    await connection.commit();
                    return res.status(200).json({ message: "Subject updated successfully" });
                } else {
                    await connection.rollback();
                    return res.status(400).json({ message: "Failed to update subject" });
                }
            } catch (err) {
                await connection.rollback();
                console.error("Error updating subjects:", err);
                return res.status(500).json({ message: "Internal server error" });
            } finally {
                connection.release();
            }
        } catch (err) {
            console.log("Error updating subjects:", err);
            return res.status(500).json({ message: "Internal server error" });
        }
    });


    router.delete('/deleteSubject/:sub_id', async (req, res) => {
        try {
            const subId = req.params.sub_id;

            if (!subId) {
                return res.status(400).json({ message: "Subject ID is required" });
            }

            const connection = await db.getConnection();
            await connection.beginTransaction();

            try {
                const deleteQuery = `DELETE FROM subjects WHERE sub_id = ?`;
                const [deleteResult] = await connection.query(deleteQuery, [subId]);

                if (deleteResult.affectedRows === 1) {
                    await connection.commit();
                    return res.status(200).json({ message: "Subject deleted successfully" });
                } else {
                    await connection.rollback();
                    return res.status(400).json({ message: "Failed to delete subject" });
                }
            } catch (err) {
                await connection.rollback();
                console.error("Error deleting subject:", err);
                return res.status(500).json({ message: "Internal server error" });
            } finally {
                connection.release();
            }
        } catch (err) {
            console.error("Error deleting subject:", err);
            return res.status(500).json({ message: "Internal server error" });
        }
    });


    return router;
};
