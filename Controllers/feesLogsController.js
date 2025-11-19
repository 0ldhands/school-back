const express = require('express');
const router = express.Router();
const moment = require("moment");
const cors = require("cors");
const currentDate = moment().format('YYYY-MM-DD HH:mm:ss');

module.exports = (db) => {


    router.use(cors());
    router.post('/saveFeesLogs', async (req, res) => {
        const connection = await db.getConnection();
        try {
            const { fees_id, roll_no, paid_amount, payment_method } = req.body;
            if (!fees_id || !roll_no || !paid_amount || !payment_method) {
                return res.status(400).json({ message: "Fees ID, Roll number, Paid amount, and Payment method are required." });
            }

            const fetchRemainingAmountQuery = `
                SELECT remaining_amount, is_fully_paid 
                FROM fees_allocation 
                WHERE fees_id = ? AND roll_no = ?
            `;
            const [fetchRemainingAmountRes] = await connection.query(fetchRemainingAmountQuery, [fees_id, roll_no]);

            if (fetchRemainingAmountRes.length === 0) {
                return res.status(404).json({ message: "Fees allocation not found for the given fees ID and roll number." });
            }

            const { remaining_amount, is_fully_paid } = fetchRemainingAmountRes[0];
            if (remaining_amount <= 0) {
                return res.status(400).json({ message: "The fees have already been fully paid." });
            }

            if (paid_amount > remaining_amount) {
                return res.status(400).json({ message: "The paid amount exceeds the remaining amount." });
            }

            const updatedRemainingAmount = remaining_amount - paid_amount;

            // Begin transaction
            await connection.beginTransaction();

            const updateRemainingAmountQuery = `
                UPDATE fees_allocation 
                SET remaining_amount = ?, updated_at = ?
                WHERE fees_id = ? AND roll_no = ?
            `;
            const [updateResult] = await connection.query(updateRemainingAmountQuery, [updatedRemainingAmount, currentDate, fees_id, roll_no]);

            if (updateResult.affectedRows === 0) {
                await connection.rollback();
                return res.status(500).json({ message: "Failed to update fees allocation." });
            }

            if (updatedRemainingAmount === 0) {
                const updateIsFullyPaidQuery = `
                    UPDATE fees_allocation 
                    SET is_fully_paid = 1 
                    WHERE fees_id = ? AND roll_no = ?
                `;
                const [updateFullyPaidResult] = await connection.query(updateIsFullyPaidQuery, [fees_id, roll_no]);
                if (updateFullyPaidResult.affectedRows === 0) {
                    await connection.rollback();
                    return res.status(500).json({ message: "Failed to update is_fully_paid status." });
                }
            }

            const insertPaymentQuery = `
                INSERT INTO fees_logs (fees_id, roll_no, paid_amount, payment_date, payment_method, created_at) 
                VALUES (?, ?, ?, ?, ?, ?)
            `;
            const [insertResult] = await connection.query(insertPaymentQuery, [fees_id, roll_no, paid_amount, currentDate, payment_method, currentDate]);

            if (insertResult.affectedRows === 0) {
                await connection.rollback();
                return res.status(500).json({ message: "Failed to insert fees log." });
            }

            // Commit transaction
            await connection.commit();

            return res.status(200).json({ message: "Payment recorded successfully." });

        } catch (err) {
            await connection.rollback();
            console.error("Error saving fees log data:", err);
            return res.status(500).json({ message: "Internal server error." });
        } finally {
            connection.release();
        }
    });


    router.get('/getFeesLogs',async(req,res)=>{
        try{
           const getQuery = `select 
           fee_log.log_id,
           fee_log.fees_id,
           fee_log.roll_no,
           fee_log.paid_amount,
           fee_log.payment_date,
           fee_log.payment_method,
           fee_all.academic_year,
           fee_all.fee_category,
           fee_all.amount,
           stu.stu_name,
           stu.stu_img,
           cls.cls_name,
           sec.sec_name
           from fees_logs fee_log 
           inner join fees_allocation fee_all on fee_all.fees_id = fee_log.fees_id
           inner join students_allocation stu_all on stu_all.roll_no = fee_log.roll_no
           inner join students_master stu on stu.stu_id = stu_all.stu_id
           inner join class_allocation cls_all on cls_all.cls_allocation_id = stu_all.cls_allocation_id
           inner join class cls on cls.cls_id = cls_all.cls_id
           inner join sections sec on sec.sec_id = cls_all.sec_id
           `;
           const [results] = await db.query(getQuery);
          if (results.length == 0) {
            return res.status(404).json({ message: "Fees logs data not found." });
          } else {
            const convertData = results.map((result) => ({
              ...result,
              stu_img: `http://localhost:3001/uploads/${result.stu_img}` 
            }));
            return res.status(200).json(convertData);
          }
        }
        catch(err){
            console.log("Error Fetching Fees log data :",err);
            return res.status(500).json({message:"Internal server error."})
        }
    });


    router.get('/getFeesLogsBYFeeId/:fees_id', async (req, res) => {
        try {
            const fee_id = req.params.fees_id;
    
            const getQuery = `
                SELECT 
                    fee_log.log_id,
                    fee_log.fees_id,
                    fee_log.roll_no,
                    fee_log.paid_amount,
                    fee_log.payment_date,
                    fee_log.payment_method,
                    fee_all.academic_year,
                    fee_all.fee_category,
                    fee_all.amount,
                    stu.stu_name,
                    stu.stu_img,
                    cls.cls_name,
                    sec.sec_name
                FROM fees_logs fee_log 
                INNER JOIN fees_allocation fee_all ON fee_all.fees_id = fee_log.fees_id
                INNER JOIN students_allocation stu_all ON stu_all.roll_no = fee_log.roll_no
                INNER JOIN students_master stu ON stu.stu_id = stu_all.stu_id
                INNER JOIN class_allocation cls_all ON cls_all.cls_allocation_id = stu_all.cls_allocation_id
                INNER JOIN class cls ON cls.cls_id = cls_all.cls_id
                INNER JOIN sections sec ON sec.sec_id = cls_all.sec_id 
                WHERE fee_log.fees_id = ?
            `;
    
            const [results] = await db.query(getQuery, [fee_id]);
    
            if (results.length === 0) {
                return res.status(404).json({ message: "Fees logs data not found." });
            } else {
                const convertData = results.map((result) => ({
                    ...result,
                    stu_img: `http://localhost:3001/uploads/${result.stu_img}` 
                }));
                return res.status(200).json(convertData);
            }
        } catch (err) {
            console.log("Error fetching fees log data:", err);
            return res.status(500).json({ message: "Internal server error." });
        }
    });
    


    router.put('/updateFeesLog/:log_id', async (req, res) => {
        const connection = await db.getConnection();
        try {
            const log_id = req.params.log_id;
            const { fees_id, roll_no, paid_amount, payment_method } = req.body;
            if (!log_id || !fees_id || !roll_no || !paid_amount || !payment_method) {
                return res.status(400).json({ message: "Log ID, Fees ID, Roll number, Paid amount, and Payment method are required." });
            }
            const fetchLogQuery = `
                SELECT paid_amount FROM fees_logs WHERE log_id = ? AND fees_id = ? AND roll_no = ?
            `;
            const [fetchLogRes] = await connection.query(fetchLogQuery, [log_id, fees_id, roll_no]);

            if (fetchLogRes.length === 0) {
                return res.status(404).json({ message: "Fee log not found for the given log ID, fees ID, and roll number." });
            }
            const previousPaidAmount = parseFloat(fetchLogRes[0].paid_amount);
            const fetchRemainingAmountQuery = `
                SELECT remaining_amount, discount_amount FROM fees_allocation WHERE fees_id = ? AND roll_no = ?
            `;
            const [fetchRemainingAmountRes] = await connection.query(fetchRemainingAmountQuery, [fees_id, roll_no]);

            if (fetchRemainingAmountRes.length === 0) {
                return res.status(404).json({ message: "Fees allocation not found for the given fees ID and roll number." });
            }

            let { remaining_amount, discount_amount } = fetchRemainingAmountRes[0];

            remaining_amount = parseFloat(remaining_amount);
            discount_amount = parseFloat(discount_amount);
            const paidAmount = parseFloat(paid_amount);

            // Calculate the updated remaining amount
            const adjustedRemainingAmount = remaining_amount + previousPaidAmount - paidAmount;

            if (isNaN(adjustedRemainingAmount) || adjustedRemainingAmount < 0) {
                return res.status(400).json({ message: "The updated paid amount exceeds the remaining amount." });
            }

            // Begin transaction
            await connection.beginTransaction();

            // Update the remaining amount in fees_allocation
            const updateRemainingAmountQuery = `
                UPDATE fees_allocation 
                SET remaining_amount = ?, updated_at = ?
                WHERE fees_id = ? AND roll_no = ?
            `;
            const [updateResult] = await connection.query(updateRemainingAmountQuery, [adjustedRemainingAmount, currentDate, fees_id, roll_no]);

            if (updateResult.affectedRows === 0) {
                await connection.rollback();
                return res.status(500).json({ message: "Failed to update fees allocation." });
            }

            // Update is_fully_paid status if needed
            const isFullyPaid = adjustedRemainingAmount === 0 ? 1 : 0;
            const updateIsFullyPaidQuery = `
                UPDATE fees_allocation 
                SET is_fully_paid = ? 
                WHERE fees_id = ? AND roll_no = ?
            `;
            const [updateFullyPaidResult] = await connection.query(updateIsFullyPaidQuery, [isFullyPaid, fees_id, roll_no]);
            if (updateFullyPaidResult.affectedRows === 0) {
                await connection.rollback();
                return res.status(500).json({ message: "Failed to update is_fully_paid status." });
            }

            // Update the fee log
            const updateLogQuery = `
                UPDATE fees_logs 
                SET paid_amount = ?, payment_method = ?, updated_at = ?
                WHERE log_id = ? AND fees_id = ? AND roll_no = ?
            `;
            const [updateLogResult] = await connection.query(updateLogQuery, [paidAmount, payment_method, currentDate, log_id, fees_id, roll_no]);

            if (updateLogResult.affectedRows === 0) {
                await connection.rollback();
                return res.status(500).json({ message: "Failed to update fee log." });
            }

            // Commit transaction
            await connection.commit();

            return res.status(200).json({ message: "Fee log updated successfully." });

        } catch (err) {
            await connection.rollback();
            console.error("Error updating fee log data:", err);
            return res.status(500).json({ message: "Internal server error." });
        } finally {
            connection.release();
        }
    });

    router.delete('/deleteFeesLog/:log_id', async (req, res) => {
        const connection = await db.getConnection();
        try {
            const log_id = req.params.log_id;

            // Fetch the existing fee log
            const fetchLogQuery = `
                SELECT fees_id, roll_no, paid_amount FROM fees_logs WHERE log_id = ?
            `;
            const [fetchLogRes] = await connection.query(fetchLogQuery, [log_id]);

            if (fetchLogRes.length === 0) {
                return res.status(404).json({ message: "Fee log not found for the given log ID." });
            }

            const { fees_id, roll_no, paid_amount } = fetchLogRes[0];

            // Fetch the remaining amount from fees_allocation
            const fetchRemainingAmountQuery = `
                SELECT remaining_amount FROM fees_allocation WHERE fees_id = ? AND roll_no = ?
            `;
            const [fetchRemainingAmountRes] = await connection.query(fetchRemainingAmountQuery, [fees_id, roll_no]);

            if (fetchRemainingAmountRes.length === 0) {
                return res.status(404).json({ message: "Fees allocation not found for the given fees ID and roll number." });
            }

            let { remaining_amount } = fetchRemainingAmountRes[0];

            remaining_amount = parseFloat(remaining_amount);
            const paidAmount = parseFloat(paid_amount);

            // Calculate the updated remaining amount
            const updatedRemainingAmount = remaining_amount + paidAmount;

            // Begin transaction
            await connection.beginTransaction();

            // Update the remaining amount in fees_allocation
            const updateRemainingAmountQuery = `
                UPDATE fees_allocation 
                SET remaining_amount = ?, updated_at = ?
                WHERE fees_id = ? AND roll_no = ?
            `;
            const [updateResult] = await connection.query(updateRemainingAmountQuery, [updatedRemainingAmount, currentDate, fees_id, roll_no]);

            if (updateResult.affectedRows === 0) {
                await connection.rollback();
                return res.status(500).json({ message: "Failed to update fees allocation." });
            }

            // Update is_fully_paid status if needed
            const isFullyPaid = updatedRemainingAmount === 0 ? 1 : 0;
            const updateIsFullyPaidQuery = `
                UPDATE fees_allocation 
                SET is_fully_paid = ? 
                WHERE fees_id = ? AND roll_no = ?
            `;
            const [updateFullyPaidResult] = await connection.query(updateIsFullyPaidQuery, [isFullyPaid, fees_id, roll_no]);
            if (updateFullyPaidResult.affectedRows === 0) {
                await connection.rollback();
                return res.status(500).json({ message: "Failed to update is_fully_paid status." });
            }

            // Delete the fee log
            const deleteLogQuery = `
                DELETE FROM fees_logs WHERE log_id = ?
            `;
            const [deleteLogResult] = await connection.query(deleteLogQuery, [log_id]);

            if (deleteLogResult.affectedRows === 0) {
                await connection.rollback();
                return res.status(500).json({ message: "Failed to delete fee log." });
            }

            // Commit transaction
            await connection.commit();

            return res.status(200).json({ message: "Fee log deleted successfully." });

        } catch (err) {
            await connection.rollback();
            console.error("Error deleting fee log data:", err);
            return res.status(500).json({ message: "Internal server error." });
        } finally {
            connection.release();
        }
    });
    

    router.get('/feeCollectionDashboard', async (req, res) => {
        console.log("collect fees data");
    
        // Get the date from the query parameter or use the current date
        const currentDate = req.query.date || moment().format("YYYY-MM-DD");
    
        // SQL query to get the total amount of fees collected per student with optional date filter
        const query = `
            SELECT stu_id, stu_name, SUM(payingfee) AS total_amount, MAX(remainingfee) AS remainingfee
            FROM collect_fee
            WHERE feedate = ?
            GROUP BY stu_id, stu_name
        `;
    
        try {
            // Execute the query with the date parameter
            const [results] = await db.query(query, [currentDate]);
            
            // Log the results for debugging
            console.log('Query results:', results);
    
            // Send the results as JSON
            res.status(200).json(results);
        } catch (error) {
            console.error('Error executing query:', error);
            res.status(500).json({ error: 'Error fetching data' });
        }
    });
    

// GET API to fetch students with pending fees
router.get('/pending-fees', (req, res) => {
    const query = `
        SELECT 
            stu_id, stu_name, cls_id, pending_fees, total_fees, transport_fees, additional_fees
        FROM 
            students_master 
        WHERE 
            pending_fees > 0
        ORDER BY 
            pending_fees DESC
    `;
    
    db.query(query, (err, results) => {
        if (err) {
            console.error('Error fetching pending fees students:', err);
            return res.status(500).json({ error: 'Internal server error' });
        }
        
        res.json(results);
    });
});



    return router;
};