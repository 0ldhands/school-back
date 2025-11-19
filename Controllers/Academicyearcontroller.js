const express = require('express');
const cors = require('cors');
module.exports = (db) => {
  const router = express.Router();
  router.use(cors());

  async function executeQuery(query, params = []) {
    try {
      const [result] = await db.query(query, params);
      return result;
    } catch (error) {
      console.error('Database Query Error:', error);
      throw error;
    }
  }
  
  // Route to handle the academic year update
  router.post('/updateAcademicYear', async (req, res) => {
    const { oldAcademicYear, newAcademicYear } = req.body;
  
    // Step 1: Validate the input data
    if (!oldAcademicYear || !newAcademicYear) {
      return res.status(400).json({ message: 'Both oldAcademicYear and newAcademicYear are required' });
    }
  
    // Regex to check if the academic year format is correct (YYYY-YYYY)
    const academicYearRegex = /^\d{4}-\d{4}$/;
    if (!academicYearRegex.test(oldAcademicYear) || !academicYearRegex.test(newAcademicYear)) {
      return res.status(400).json({ message: 'Academic years must be in the format YYYY-YYYY' });
    }
  
    if (oldAcademicYear === newAcademicYear) {
      return res.status(400).json({ message: 'Old and new academic years cannot be the same' });
    }
  
    const connection = await db.getConnection();  // Get database connection
  
    try {
      await connection.beginTransaction();  // Start a transaction to ensure atomicity
  
      // Step 1: Copy all students with pending fees to the academicyearfeependingstudents table
      const copyStudentsQuery = `
        INSERT INTO academicyearfeependingstudents
        SELECT * FROM students_master WHERE academic_year = ?;
      `;
      await executeQuery(copyStudentsQuery, [oldAcademicYear]);
  
      // Step 2: Update students in students_master for the new academic year
      const updateStudentsQuery = `
        UPDATE students_master sm
        JOIN class c ON sm.cls_id = c.cls_id
        SET sm.academic_year = ?,
            sm.cls_id = CASE 
                          WHEN sm.cls_id = 13 THEN NULL 
                          ELSE sm.cls_id + 1 
                        END,
            sm.van_student = NULL,
            sm.eca_student = NULL,
            sm.scheme_student = NULL,
            sm.ecaPayFees = NULL,
            sm.vanpayFees = NULL,
            sm.schemepayFees = NULL,
            sm.payingfees = 0,
            sm.bookingfees = 0,
            sm.pending_fees = 0,
            sm.ecaRemaningFees = 0,
            sm.vanRemaningFees = 0,
            sm.schemeRemaningFees = 0
        WHERE sm.academic_year = ?
        AND sm.cls_id IS NOT NULL
        AND sm.stu_id IS NOT NULL
        AND sm.stu_id > 0;
      `;
      await executeQuery(updateStudentsQuery, [newAcademicYear, oldAcademicYear]);
  
      // Step 3: Update tuition fee information from the class table
      const updateFeesQuery = `
        UPDATE students_master sm
        JOIN class c ON sm.cls_id = c.cls_id
        SET sm.tution_fees = c.tution_fees,
            sm.firstinstallment = c.firstinstallment,
            sm.secondinstallment = c.secondinstallment,
            sm.pending_fees = CASE 
                                WHEN sm.pending_fees = 0 THEN c.tution_fees 
                                ELSE sm.pending_fees 
                              END
        WHERE sm.academic_year = ?
        AND sm.stu_id > 0;
      `;
      await executeQuery(updateFeesQuery, [newAcademicYear]);
  
      // Commit the transaction if all steps are successful
      await connection.commit();
  
      res.status(200).json({ message: 'Academic year updated successfully' });
  
    } catch (error) {
      await connection.rollback();  // Rollback if anything fails
      console.error('Error updating academic year:', error);
      res.status(500).json({ message: 'An error occurred while updating the academic year', error: error.message });
    } finally {
      connection.release();  // Release the connection back to the pool
    }
  });
  
    
  router.get("/getAllAcademicyearStudents", async (req, res) => {
    try {
      const getQuery = `SELECT * FROM academicyearfeependingstudents`;
      const [results] = await db.query(getQuery);
      if (results.length === 0) {
        return res.status(404).json({ message: "Students data not found." });
      }
      return res.status(200).json(results);
    } catch (error) {
      console.error("Error fetching Students data:", error);
      return res.status(500).json({ message: "Internal server error." });
    }
  });


  router.get("/getlastyearPendingStudents", async (req, res) => {
    try {
      // SQL query to select students with at least one non-zero or non-null fee
      const getQuery = `
        SELECT * FROM academicyearfeependingstudents
        WHERE 
          (vanRemaningFees IS NOT NULL AND vanRemaningFees != 0) OR
          (ecaRemaningFees IS NOT NULL AND ecaRemaningFees != 0) OR
          (schemeRemaningFees IS NOT NULL AND schemeRemaningFees != 0) OR
          (pending_fees IS NOT NULL AND pending_fees != 0)
      `;
      
      // Execute the query
      const [results] = await db.query(getQuery);
      
      // Check if no results were returned
      if (results.length === 0) {
        return res.status(404).json({ message: "No students with pending fees found." });
      }
      
      // Return the results as JSON
      return res.status(200).json(results);
    } catch (error) {
      console.error("Error fetching students data:", error);
      return res.status(500).json({ message: "Internal server error." });
    }
  });

  router.get('/lastyearpayfees/:stu_id',async(req,res)=>{
    try{
      const stu_id = req.params.stu_id
     const getQuery= `SELECT stu.*, cls.cls_name
  FROM academicyearfeependingstudents AS stu
  
  inner join class as cls on stu.cls_id = cls.cls_id
  WHERE stu.stu_id = ?`
      const [results] = await db.query(getQuery,[stu_id]);
      // console.log({results})
      if (results.length == 0) {
        return res
          .status(404)
          .json({ message: "Fees Allocation data not found." });
      } else {
        const convertData = results.map((result) => ({
          ...result,
          stu_img: `http://localhost:3001/uploads/${result.stu_img}`,
        }));
        return res.status(200).json(convertData);
      }
    } catch (error) {
      console.error("Error fetching Fees Allocation data:", error);
      return res.status(500).json({ message: "Internal server error." });
    }
  });

  router.post('/lasteyearvanfeeslogdata', async (req, res) => {
    const { stu_id,stu_name, payingfee, feedate, payment_method } = req.body;
  
    try {
        // Start a transaction
        await db.query('START TRANSACTION');
  
        // Fetch the existing payingfee and vanfees from students_master
        const [existingData] = await db.query(
            'SELECT vanpayFees, van FROM academicyearfeependingstudents WHERE stu_id = ?',
            [stu_id]
        );
  
        if (!existingData.length) {
            throw new Error('Student not found');
        }
  
        const { vanpayFees, van } = existingData[0];
  
        // Calculate the new total paying fee and remaining fee
        const newTotalPayingFee = vanpayFees + payingfee;
        const newRemainingFee = van - newTotalPayingFee;
  
        // Insert fees log data into vancollect_fee
        const insertQuery = `INSERT INTO vancollect_fee (stu_id, stu_name, vanpayingfee, vanRemaningFees, feedate, payment_method) VALUES (?, ?, ?, ?, ?, ?)`;
        const [result] = await db.query(insertQuery, [stu_id, stu_name, payingfee, newRemainingFee, feedate, payment_method]);
  
        // Update total paying fee and remaining fee in students_master table
        const updateQuery = `UPDATE academicyearfeependingstudents SET vanpayFees = ?, vanRemaningFees = ? WHERE stu_id = ?`;
        await db.query(updateQuery, [newTotalPayingFee, newRemainingFee, stu_id]);
  
        // Commit the transaction
        await db.query('COMMIT');
  
        return res.status(201).json({ feeslogid: result.insertId });
    } catch (error) {
        console.error('Error logging fees and updating student:', error);
        await db.query('ROLLBACK'); // Rollback in case of error
        res.status(500).json({ message: 'Internal server error' });
    }
  });

  router.post('/lastyearschemefeeslogdata', async (req, res) => {
    const { stu_id,stu_name, payingfee, feedate, payment_method } = req.body;
  
    try {
        // Start a transaction
        await db.query('START TRANSACTION');
  
        // Fetch the existing payingfee and vanfees from students_master
        const [existingData] = await db.query(
            'SELECT schemepayFees, scheme FROM academicyearfeependingstudents WHERE stu_id = ?',
            [stu_id]
        );
  
        if (!existingData.length) {
            throw new Error('Student not found');
        }
  
        const { schemepayFees, scheme } = existingData[0];
  
        // Calculate the new total paying fee and remaining fee
        const newTotalPayingFee = schemepayFees + payingfee;
        const newRemainingFee = scheme - newTotalPayingFee;
  
        // Insert fees log data into vancollect_fee
        const insertQuery = `INSERT INTO schemecollect_fee (stu_id, stu_name, schemepayingfee, schemeRemaningFees, feedate, payment_method) VALUES (?, ?, ?, ?, ?, ?)`;
        const [result] = await db.query(insertQuery, [stu_id, stu_name, payingfee, newRemainingFee, feedate, payment_method]);
  
        // Update total paying fee and remaining fee in students_master table
        const updateQuery = `UPDATE academicyearfeependingstudents SET schemepayFees = ?, schemeRemaningFees = ? WHERE stu_id = ?`;
        await db.query(updateQuery, [newTotalPayingFee, newRemainingFee, stu_id]);
  
        // Commit the transaction
        await db.query('COMMIT');
  
        return res.status(201).json({ feeslogid: result.insertId });
    } catch (error) {
        console.error('Error logging fees and updating student:', error);
        await db.query('ROLLBACK'); // Rollback in case of error
        res.status(500).json({ message: 'Internal server error' });
    }
  });

  router.post('/lastyearecafeeslogdata', async (req, res) => {
    const { stu_id,stu_name, payingfee, feedate, payment_method } = req.body;
  
    try {
        // Start a transaction
        await db.query('START TRANSACTION');
  
        // Fetch the existing payingfee and vanfees from students_master
        const [existingData] = await db.query(
            'SELECT ecapayFees,eca_fees FROM academicyearfeependingstudents WHERE stu_id = ?',
            [stu_id]
        );
  
        if (!existingData.length) {
            throw new Error('Student not found');
        }
  
        const { ecapayFees, eca_fees } = existingData[0];
  
        // Calculate the new total paying fee and remaining fee
        const newTotalPayingFee = ecapayFees + payingfee;
        const newRemainingFee = eca_fees - newTotalPayingFee;
  
        // Insert fees log data into vancollect_fee
        const insertQuery = `INSERT INTO ecacollect_fee (stu_id, stu_name, ecapayingfee, ecaRemaningFees, feedate, payment_method) VALUES (?, ?, ?, ?, ?, ?)`;
        const [result] = await db.query(insertQuery, [stu_id, stu_name, payingfee, newRemainingFee, feedate, payment_method]);
  
        // Update total paying fee and remaining fee in students_master table
        const updateQuery = `UPDATE academicyearfeependingstudents SET ecapayFees = ?, ecaRemaningFees = ? WHERE stu_id = ?`;
        await db.query(updateQuery, [newTotalPayingFee, newRemainingFee, stu_id]);
  
        // Commit the transaction
        await db.query('COMMIT');
  
        return res.status(201).json({ feeslogid: result.insertId });
    } catch (error) {
        console.error('Error logging fees and updating student:', error);
        await db.query('ROLLBACK'); // Rollback in case of error
        res.status(500).json({ message: 'Internal server error' });
    }
  });

  router.post('/lastyearfeeslogdata', async (req, res) => {
    console.log("Received data:", req.body);
    const { stu_id, stu_name, payingfee, discount, remainingfee, feedate, paymentMethod } = req.body;
  
    try {
      // Start a transaction
      await db.query('START TRANSACTION');
  
      // Fetch the current fee-related data for the student
      const [studentData] = await db.query(`
        SELECT tution_fees, bookingfees, pending_fees, payingfees, discount 
        FROM academicyearfeependingstudents
        WHERE stu_id = ?
      `, [stu_id]);
  
      if (studentData.length === 0) {
        await db.query('ROLLBACK');
        return res.status(404).json({ message: 'Student not found' });
      }
  
      const { tution_fees, bookingfees, pending_fees, payingfees: currentPayingFee, discount: currentDiscount } = studentData[0];
  
      // Calculate the new total paying fee and remaining fees
      const totalFees = tution_fees - bookingfees;
      const newPayingFee = currentPayingFee + payingfee;
      const newRemainingFee = totalFees - (newPayingFee + discount);
  
      if (newRemainingFee < 0) {
        await db.query('ROLLBACK');
        return res.status(400).json({ message: 'Remaining fees cannot be negative' });
      }
  
      // Insert the payment log into the collect_fee table
      const insertQuery = `
        INSERT INTO collect_fee (stu_id, stu_name, payingfee, remainingfee, feedate, payment_method) 
        VALUES (?, ?, ?, ?, ?, ?)
      `;
      const [result] = await db.query(insertQuery, [stu_id, stu_name, payingfee, newRemainingFee, feedate, paymentMethod]);
  
      // Update the students_master table with the new discount, pending fee, and total paying fee
      const updateQuery = `
        UPDATE academicyearfeependingstudents 
        SET pending_fees = ?, 
            discount = ?, 
            payingfees = ? 
        WHERE stu_id = ?
      `;
      await db.query(updateQuery, [newRemainingFee, discount, newPayingFee, stu_id]);
  
      // Commit the transaction
      await db.query('COMMIT');
  
      return res.status(201).json({ feeslogid: result.insertId });
    } catch (error) {
      console.error('Error logging fees and updating student:', error);
      await db.query('ROLLBACK');
      return res.status(500).json({ message: 'Internal server error' });
    }
  });

  return router;

  
};
