const express = require('express');
const router = express.Router();
const moment = require("moment");
const currentDate = moment().format('YYYY-MM-DD HH:mm:ss');

module.exports = (db) => {
    router.post('/saveDiscount', async (req, res) => {
        try {
            const { fees_id, roll_no, discount_amount, discount_percentage, reason } = req.body;

            // Check if required parameters are provided
            if (!fees_id || !roll_no || (!discount_amount && !discount_percentage) || !reason) {
                return res.status(400).json({ message: "Fees ID, Roll number, Discount amount or percentage, and Reason are required." });
            }

            // Fetch fee allocation amount and remaining amount
            const fetchFeeDetailsQuery = `
                SELECT amount, remaining_amount, discount_amount FROM fees_allocation WHERE fees_id = ? AND roll_no = ?
            `;
            const [fetchFeeDetailsRes] = await db.query(fetchFeeDetailsQuery, [fees_id, roll_no]);

            if (fetchFeeDetailsRes.length === 0) {
                return res.status(404).json({ message: "Fees allocation not found for the given fees ID and roll number." });
            }

            const feeAmount = fetchFeeDetailsRes[0].amount;
            let remainingAmount = fetchFeeDetailsRes[0].remaining_amount;
            let discountAmount = parseInt(fetchFeeDetailsRes[0].discount_amount, 10) || 0; // Convert to integer, default to 0 if null

            // Calculate discount amount if discount comes in percentage
            let calculatedDiscountAmount = 0;
            if (discount_percentage) {
                calculatedDiscountAmount = (feeAmount * discount_percentage) / 100;
            }

            // Calculate discount percentage if discount amount is provided
            let calculatedDiscountPercentage = 0;
            if (discount_amount) {
                calculatedDiscountPercentage = (discount_amount / feeAmount) * 100;
            }

            // Round the discount amount to 2 decimal places
            const finalDiscountAmount = discount_amount || calculatedDiscountAmount;
            const roundedFinalDiscountAmount = Math.round(finalDiscountAmount * 100) / 100;

            // Use provided discount percentage if available
            const finalDiscountPercentage = discount_percentage || calculatedDiscountPercentage;

            // Check if the final discount amount is valid
            if (roundedFinalDiscountAmount > remainingAmount) {
                return res.status(400).json({ message: "The discount amount exceeds the remaining amount." });
            }

            // Update the remaining amount and discount amount after applying the discount
            remainingAmount -= roundedFinalDiscountAmount;
            discountAmount += roundedFinalDiscountAmount;

            // Check if the remaining amount is zero to update isFullyPaid status
            const isFullyPaid = remainingAmount === 0 ? 1 : 0;

            const updateRemainingAmountQuery = `
                UPDATE fees_allocation 
                SET discount_amount = ?, remaining_amount = ?, is_fully_paid = ?, updated_at = ?
                WHERE fees_id = ? AND roll_no = ?
            `;
            await db.query(updateRemainingAmountQuery, [discountAmount, remainingAmount, isFullyPaid, currentDate, fees_id, roll_no]);

            // Insert discount log
            const insertDiscountLogQuery = `
                INSERT INTO discounts (fees_id, roll_no, discount_amount, discount_percentage, reason, created_at) 
                VALUES (?, ?, ?, ?, ?, ?)
            `;
            await db.query(insertDiscountLogQuery, [fees_id, roll_no, roundedFinalDiscountAmount, finalDiscountPercentage, reason, currentDate]);

            return res.status(200).json({ message: "Discount recorded successfully." });

        } catch (err) {
            console.error("Error saving discount data:", err);
            return res.status(500).json({ message: "Internal server error." });
        }
    });


    router.get('/getDiscount',async(req,res)=>{
        try{
           const getQuery = `select 
           dis.discount_id,
           dis.fees_id,
           dis.roll_no,
           dis.discount_amount,
           dis.discount_percentage,
           dis.reason,
           fee_all.academic_year,
           fee_all.fee_category,
           fee_all.amount,
           stu.stu_name,
           stu.stu_img,
           cls.cls_name,
           sec.sec_name
           from discounts dis 
           inner join fees_allocation fee_all on fee_all.fees_id = dis.fees_id
           inner join students_allocation stu_all on stu_all.roll_no = dis.roll_no
           inner join students_master stu on stu.stu_id = stu_all.stu_id
           inner join class_allocation cls_all on cls_all.cls_allocation_id = stu_all.cls_allocation_id
           inner join class cls on cls.cls_id = cls_all.cls_id
           inner join sections sec on sec.sec_id = cls_all.sec_id
           `;
           const [results] = await db.query(getQuery);
          if (results.length == 0) {
            return res.status(404).json({ message: "Discount data not found." });
          } else {
            const convertData = results.map((result) => ({
              ...result,
              stu_img: `http://localhost:3001/uploads/${result.stu_img}` 
            }));
            return res.status(200).json(convertData);
          }
        }
        catch(err){
            console.log("Error Fetching Discount data :",err);
            return res.status(500).json({message:"Internal server error."})
        }
    });


    router.get('/getDiscountByFeesId/:fees_id',async(req,res)=>{
        try{
            const fees_id = req.params.fees_id;
           const getQuery = `select 
           dis.discount_id,
           dis.fees_id,
           dis.roll_no,
           dis.discount_amount,
           dis.discount_percentage,
           dis.reason,
           fee_all.academic_year,
           fee_all.fee_category,
           fee_all.amount,
           stu.stu_name,
           stu.stu_img,
           cls.cls_name,
           sec.sec_name
           from discounts dis 
           inner join fees_allocation fee_all on fee_all.fees_id = dis.fees_id
           inner join students_allocation stu_all on stu_all.roll_no = dis.roll_no
           inner join students_master stu on stu.stu_id = stu_all.stu_id
           inner join class_allocation cls_all on cls_all.cls_allocation_id = stu_all.cls_allocation_id
           inner join class cls on cls.cls_id = cls_all.cls_id
           inner join sections sec on sec.sec_id = cls_all.sec_id
           where dis.fees_id = ?
           `;
           const [results] = await db.query(getQuery,[fees_id]);
          if (results.length == 0) {
            return res.status(404).json({ message: "Discount data not found." });
          } else {
            const convertData = results.map((result) => ({
              ...result,
              stu_img: `http://localhost:3001/uploads/${result.stu_img}` 
            }));
            return res.status(200).json(convertData);
          }
        }
        catch(err){
            console.log("Error Fetching Discount data :",err);
            return res.status(500).json({message:"Internal server error."})
        }
    });


    router.put('/updateDiscount/:discount_id', async (req, res) => {
        try {
            const discount_id = req.params.discount_id;
            const { fees_id, roll_no, discount_amount, discount_percentage, reason } = req.body;
    
            // Check if required parameters are provided
            if (!discount_id || !fees_id || !roll_no || (!discount_amount && !discount_percentage) || !reason) {
                return res.status(400).json({ message: "Discount ID, Fees ID, Roll number, Discount amount or percentage, and Reason are required." });
            }
    
            // Fetch fee allocation amount and remaining amount
            const fetchFeeDetailsQuery = `
                SELECT amount, remaining_amount, discount_amount FROM fees_allocation WHERE fees_id = ? AND roll_no = ?
            `;
            const [fetchFeeDetailsRes] = await db.query(fetchFeeDetailsQuery, [fees_id, roll_no]);
    
            if (fetchFeeDetailsRes.length === 0) {
                return res.status(404).json({ message: "Fees allocation not found for the given fees ID and roll number." });
            }
    
            const feeAmount = fetchFeeDetailsRes[0].amount;
            let remainingAmount = fetchFeeDetailsRes[0].remaining_amount;
            let currentDiscountAmount = parseFloat(fetchFeeDetailsRes[0].discount_amount);
    
            // Calculate the current discount percentage
            const currentDiscountPercentage = (currentDiscountAmount / feeAmount) * 100;
    
            // Calculate the new discount amount based on the provided percentage or amount
            let newDiscountAmount = currentDiscountAmount;
            if (discount_percentage) {
                newDiscountAmount = (feeAmount * discount_percentage) / 100;
            } else if (discount_amount) {
                newDiscountAmount = parseFloat(discount_amount);
            }
    
            // Update the remaining amount after adjusting the discount
            const discountDifference = newDiscountAmount - currentDiscountAmount;
            remainingAmount -= discountDifference;
    
            // Update the isFullyPaid status based on the remaining amount
            const isFullyPaid = remainingAmount === 0 ? 1 : 0;
    
            // Update the fees_allocation table
            const updateFeesAllocationQuery = `
                UPDATE fees_allocation 
                SET discount_amount = ?, remaining_amount = ?, is_fully_paid = ?, updated_at = ?
                WHERE fees_id = ? AND roll_no = ?
            `;
            await db.query(updateFeesAllocationQuery, [newDiscountAmount, remainingAmount, isFullyPaid, currentDate, fees_id, roll_no]);
    
            // Update the discount record
            const updateDiscountQuery = `
                UPDATE discounts 
                SET discount_amount = ?, discount_percentage = ?, reason = ?, updated_at = ? 
                WHERE discount_id = ?
            `;
            await db.query(updateDiscountQuery, [newDiscountAmount, (newDiscountAmount / feeAmount) * 100, reason, currentDate, discount_id]);
    
            return res.status(200).json({ message: "Discount updated successfully." });
    
        } catch (err) {
            console.error("Error updating discount data:", err);
            return res.status(500).json({ message: "Internal server error." });
        }
    });
    
    
    router.delete('/deleteDiscount/:discount_id', async (req, res) => {
        const connection = await db.getConnection();
        try {
            const discount_id = req.params.discount_id;
    
            // Fetch the existing discount record
            const fetchDiscountQuery = `
                SELECT fees_id, roll_no, discount_amount FROM discounts WHERE discount_id = ?
            `;
            const [fetchDiscountRes] = await connection.query(fetchDiscountQuery, [discount_id]);
    
            if (fetchDiscountRes.length === 0) {
                return res.status(404).json({ message: "Discount record not found for the given ID." });
            }
    
            const { fees_id, roll_no, discount_amount } = fetchDiscountRes[0];
    
            // Fetch the current discount amount and remaining amount from fees_allocation
            const fetchFeeDetailsQuery = `
                SELECT remaining_amount, discount_amount FROM fees_allocation WHERE fees_id = ? AND roll_no = ?
            `;
            const [fetchFeeDetailsRes] = await connection.query(fetchFeeDetailsQuery, [fees_id, roll_no]);
    
            if (fetchFeeDetailsRes.length === 0) {
                return res.status(404).json({ message: "Fees allocation not found for the given fees ID and roll number." });
            }
    
            let { remaining_amount, discount_amount: currentDiscountAmount } = fetchFeeDetailsRes[0];
            currentDiscountAmount = parseFloat(currentDiscountAmount);
            remaining_amount = parseFloat(remaining_amount);
    
            // Calculate the updated discount amount
            const updatedDiscountAmount = currentDiscountAmount - discount_amount;
    
            // Calculate the updated remaining amount and is_fully_paid status
            const updatedRemainingAmount = remaining_amount + discount_amount;
            const isFullyPaid = updatedRemainingAmount === 0 ? 1 : 0;
    
            // Begin transaction
            await connection.beginTransaction();
    
            // Update the discount and remaining amount in fees_allocation
            const updateFeesAllocationQuery = `
                UPDATE fees_allocation 
                SET discount_amount = ?, remaining_amount = ?, is_fully_paid = ?, updated_at = ?
                WHERE fees_id = ? AND roll_no = ?
            `;
            const [updateResult] = await connection.query(updateFeesAllocationQuery, [updatedDiscountAmount, updatedRemainingAmount, isFullyPaid, currentDate, fees_id, roll_no]);
    
            if (updateResult.affectedRows === 0) {
                await connection.rollback();
                return res.status(500).json({ message: "Failed to update fees allocation." });
            }
    
            // Delete the discount record
            const deleteDiscountQuery = `
                DELETE FROM discounts WHERE discount_id = ?
            `;
            const [deleteResult] = await connection.query(deleteDiscountQuery, [discount_id]);
    
            if (deleteResult.affectedRows === 0) {
                await connection.rollback();
                return res.status(500).json({ message: "Failed to delete discount record." });
            }
    
            // Commit transaction
            await connection.commit();
    
            return res.status(200).json({ message: "Discount deleted successfully." });
    
        } catch (err) {
            await connection.rollback();
            console.error("Error deleting discount data:", err);
            return res.status(500).json({ message: "Internal server error." });
        } finally {
            connection.release();
        }
    });
    
    
    

    return router;
};
