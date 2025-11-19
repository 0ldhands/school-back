
const express = require("express");
const router = express.Router();
const moment = require("moment");
const currentDate = moment().format("YYYY-MM-DD HH:mm:ss");
module.exports = (db) => {
  router.post("/saveFeesAllocation", async (req, res) => {
    try {
      const { roll_no, academic_year, fee_category, amount } = req.body;
      if (!roll_no) {
        return res.status(400).json({ message: "Roll number is required." });
      }
      if (!academic_year) {
        return res.status(400).json({ message: "Academic year is required." });
      }
      if (!fee_category) {
        return res.status(400).json({ message: "Fee category is required." });
      }
      if (!amount) {
        return res.status(400).json({ message: "Amount is required." });
      }
      const rollNoCheckQuery = `
                SELECT COUNT(*) AS count 
                FROM students_allocation 
                WHERE roll_no = ? AND academic_year = ?
            `;
      const [rollNoCheckResults] = await db.query(rollNoCheckQuery, [
        roll_no,
        academic_year,
      ]);
      if (rollNoCheckResults[0].count === 1) {
        const checkFeesForRollQuery = `
                    SELECT COUNT(*) AS count 
                    FROM fees_allocation 
                    WHERE roll_no = ? AND academic_year = ? AND fee_category = ?
                `;
        const [checkFeesForRollResults] = await db.query(
          checkFeesForRollQuery,
          [roll_no, academic_year, fee_category]
        );

        if (checkFeesForRollResults[0].count > 0) {
          return res.status(400).json({
            message: `Roll number ${roll_no} is already allocated this fee category (${fee_category}) for the academic year ${academic_year}.`,
          });
        } else {
          const insertQuery = `
                        INSERT INTO fees_allocation (roll_no, academic_year, fee_category, amount,remaining_amount, created_at) 
                        VALUES (?, ?, ?, ?, ?, ?)
                    `;
          await db.query(insertQuery, [
            roll_no,
            academic_year,
            fee_category,
            amount,
            amount,
            currentDate,
          ]);

          return res
            .status(200)
            .json({ message: "Fees allocation saved successfully." });
        }
      } else {
        return res.status(404).json({
          message: "Roll number not found for the given academic year.",
        });
      }
    } catch (err) {
      console.error("Error saving fees allocation data:", err);
      return res.status(500).json({ message: "Internal server error." });
    }
  });

  router.post("/saveFeesAllocationForClass", async (req, res) => {
    const connection = await db.getConnection();
    await connection.beginTransaction();
  
    try {
      const feesAllocations = req.body; // Assuming req.body is an array of fees allocation objects
  
      if (!Array.isArray(feesAllocations) || feesAllocations.length === 0) {
        return res.status(400).json({ message: "No fees allocations provided." });
      }
  
      for (const allocation of feesAllocations) {
        const { roll_no, academic_year, fee_category, amount } = allocation;
  
        if (!roll_no || !academic_year || !fee_category || !amount) {
          await connection.rollback();
          return res.status(400).json({ message: "All fields are required." });
        }
  
        const rollNoCheckQuery = `
          SELECT COUNT(*) AS count 
          FROM students_allocation 
          WHERE roll_no = ? AND academic_year = ?
        `;
        const [rollNoCheckResults] = await connection.query(rollNoCheckQuery, [roll_no, academic_year]);
  
        if (rollNoCheckResults[0].count !== 1) {
          await connection.rollback();
          return res.status(404).json({ message: `Roll number ${roll_no} not found for the given academic year.` });
        }
  
        const checkFeesForRollQuery = `
          SELECT COUNT(*) AS count 
          FROM fees_allocation 
          WHERE roll_no = ? AND academic_year = ? AND fee_category = ?
        `;
        const [checkFeesForRollResults] = await connection.query(checkFeesForRollQuery, [roll_no, academic_year, fee_category]);
  
        if (checkFeesForRollResults[0].count > 0) {
          await connection.rollback();
          return res.status(400).json({ message: `Roll number ${roll_no} is already allocated this fee category (${fee_category}) for the academic year ${academic_year}.` });
        }
  
        const insertQuery = `
          INSERT INTO fees_allocation (roll_no, academic_year, fee_category, amount, remaining_amount, created_at) 
          VALUES (?, ?, ?, ?, ?, ?)
        `;
        await connection.query(insertQuery, [roll_no, academic_year, fee_category, amount, amount, new Date()]);
      }
  
      await connection.commit();
      return res.status(200).json({ message: "Fees allocations saved successfully." });
    } catch (err) {
      await connection.rollback();
      console.error("Error saving fees allocation data:", err);
      return res.status(500).json({ message: "Internal server error." });
    } finally {
      connection.release();
    }
  });

  router.get("/getclassessforfess",async(req,res)=>{
    try{
      const getQuery = 'select * from class';
      const [results] = await db.query(getQuery)
      if (results.length == 0) {
      return res
        .status(404)
        .json({ message: "class data from Classtable not found." });
    } else {
      
      return res.status(200).json(results);
    }
  } catch (error) {
    console.error("Error fetching Fees Allocation data:", error);
    return res.status(500).json({ message: "Internal server error." });
  }
  })



  router.post('/feesallocationforclass', async (req, res) => {
    console.log(`Received data: ${JSON.stringify(req.body)}`);
    
    const { cls_id, tution_fees, first_installment, second_installment } = req.body;
  
    // SQL query to update the tuition fees and installments in the class table
    const updateClassQuery = `
      UPDATE class 
      SET tution_fees = ?, 
          firstinstallment = ?, 
          secondinstallment = ? 
      WHERE cls_id = ?`;
  
    // SQL query to update the tuition fees and installments in the students_master table
    const updateStudentsQuery = `
      UPDATE students_master 
      SET tution_fees = ?, 
          firstinstallment = ?, 
          secondinstallment = ? 
      WHERE cls_id = ?`;
  
    try {
      // Start a transaction to ensure both updates are atomic
      await db.query('START TRANSACTION');
  
      // Execute the query to update the class table
      const classUpdateResult = await db.query(updateClassQuery, [tution_fees, first_installment, second_installment, cls_id]);
      if (classUpdateResult.affectedRows === 0) {
        throw new Error('Class not found');
      }
  
      console.log('Tuition fees and installments updated successfully in class');
  
      // Execute the query to update the students_master table
      const studentsUpdateResult = await db.query(updateStudentsQuery, [tution_fees, first_installment, second_installment, cls_id]);
  
      console.log('Tuition fees and installments updated successfully in students_master');
  
      // Commit the transaction
      await db.query('COMMIT');
  
      return res.status(200).json({ message: 'Tuition fees and installments updated successfully for the class and all students' });
  
    } catch (error) {
      console.error('Error in fees allocation:', error);
  
      // Rollback the transaction in case of error
      await db.query('ROLLBACK');
  
      if (error.message === 'Class not found') {
        return res.status(404).json({ message: 'Class not found' });
      } else {
        return res.status(500).json({ message: 'Internal server error' });
      }
    }
  });
  

  
  router.get(`/tutionfeesget/:cls_id`,async(req,res)=>{

    try{
       
      const cls_id = req.params.cls_id

      const getQuery = `select stu.*,cls.tution_fees from students_master as stu inner join 
class as cls on stu.cls_id = cls.cls_id where cls.cls_id = ?`
const [results] = await db.query(getQuery,[cls_id]);
      if (results.length == 0) {
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
  router.put('/allfeesalloc/:stu_id', async (req, res) => {
    const data = req.body;
    console.log('Received data:', data);
    try {
      const { tution_fees, transport_fees, additional_fees, firstinstallment, secondinstallment, discount, total_fees } = req.body;
      console.log(tution_fees);
      console.log(transport_fees);
      console.log(additional_fees);
      console.log(discount);
      console.log(total_fees);
  
      const stu_id = req.params.stu_id;
      const putQuery = `UPDATE students_master SET tution_fees = ?, transport_fees = ?, additional_fees = ?, firstinstallment = ?, secondinstallment = ?, discount = ?, total_fees = ? WHERE stu_id = ?`;
      const [results] = await db.query(putQuery, [tution_fees, transport_fees, additional_fees, firstinstallment, secondinstallment, discount || null, total_fees, stu_id]);
  
      if (results.affectedRows === 0) {
        return res.status(404).json({ message: "Student data not found or no changes made." });
      } else {
        return res.status(200).json({ message: "Student data updated successfully." });
      }
    } catch (err) {
      console.log("Error updating student data:", err);
      return res.status(500).json({ message: "Internal server error." });
    }
  });

  
  router.get(`/getpayfess/:stu_id`,async (req,res)=>{
    try {
      const stu_id = req.params.stu_id
      console.log(stu_id)
      const getQuery = `select * from students_master where stu_id =?`
      const [results] = await db.query(getQuery,[stu_id]);
      if (results.length == 0) {
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

  router.get("/getFeesAllocation", async (req, res) => {
    try {
      const getQuery = `
    SELECT 
    fee_all.fees_id,
    fee_all.roll_no,
    fee_all.academic_year,
    fee_all.fee_category,
    fee_all.amount,
    fee_all.remaining_amount,
    stu.stu_name,
    stu.stu_img,
    cls.cls_name,
    sec.sec_name
FROM 
    fees_allocation fee_all
INNER JOIN 
    students_allocation stu_all ON stu_all.roll_no = fee_all.roll_no
INNER JOIN 
    students_master stu ON stu.stu_id = stu_all.stu_id
INNER JOIN 
    class_allocation cls_all ON cls_all.cls_allocation_id = stu_all.cls_allocation_id
INNER JOIN 
    class cls ON cls.cls_id = cls_all.cls_id
INNER JOIN 
    sections sec ON sec.sec_id = cls_all.sec_id`;
      const [results] = await db.query(getQuery);
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

  router.put("/updateFeesAllocation/:fees_id", async (req, res) => {
    try {
      const feeId = req.params.fees_id;
      const { roll_no, academic_year, fee_category, amount } = req.body;
      if (!roll_no) {
        return res.status(400).json({ message: "Roll number is required." });
      }
      if (!academic_year) {
        return res.status(400).json({ message: "Academic year is required." });
      }
      if (!fee_category) {
        return res.status(400).json({ message: "Fee category is required." });
      }
      if (!amount) {
        return res.status(400).json({ message: "Amount is required." });
      }
      const rollNoCheckQuery = `
                SELECT COUNT(*) AS count 
                FROM students_allocation 
                WHERE roll_no = ? AND academic_year = ?
            `;
      const [rollNoCheckResults] = await db.query(rollNoCheckQuery, [
        roll_no,
        academic_year,
      ]);
      if (rollNoCheckResults[0].count === 1) {
        const checkFeesForRollQuery = `
                    SELECT COUNT(*) AS count 
                    FROM fees_allocation 
                    WHERE roll_no = ? AND academic_year = ? AND fee_category = ? and fees_id !=?
                `;
        const [checkFeesForRollResults] = await db.query(
          checkFeesForRollQuery,
          [roll_no, academic_year, fee_category, feeId]
        );

        if (checkFeesForRollResults[0].count > 0) {
          return res.status(400).json({
            message: `Roll number ${roll_no} is already allocated this fee category (${fee_category}) for the academic year ${academic_year}.`,
          });
        } else {
          const insertQuery = `
                        update fees_allocation set roll_no = ?,academic_year = ?, fee_category = ?, amount = ? ,updated_at =? where fees_id = ?
                    `;
          await db.query(insertQuery, [
            roll_no,
            academic_year,
            fee_category,
            amount,
            currentDate,
            feeId,
          ]);

          return res
            .status(200)
            .json({ message: "Fees allocation Updated successfully." });
        }
      } else {
        return res.status(404).json({
          message: "Roll number not found for the given academic year.",
        });
      }
    } catch (err) {
      console.log("Error update fees allocation data :", err);
      return res.status(500).json({ message: "Internal server error." });
    }
  });

  router.delete("/deleteFeesAllocation/:fees_id", async (req, res) => {
    try {
      const feeId = req.params.fees_id;
      if (!feeId) {
        return res.status(400).json({ message: "Fees ID is required." });
      }
      const deleteQuery = `delete from fees_allocation where fees_id = ?`;
      const [results] = await db.query(deleteQuery, [feeId]);
      if (results.affectedRows === 0) {
        return res.status(404).json({
          message: "Fees Allocation data not found or no data deleted",
        });
      } else {
        return res
          .status(200)
          .json({ message: "Fees Allocation deleted successfully." });
      }
    } catch (err) {
      console.log("Error delete fees allocation data :", err);
      return res.status(500).json({ message: "Internal server error." });
    }
  });
router.get('/payfeestud/:stu_id',async(req,res)=>{
  try{
    const stu_id = req.params.stu_id
   const getQuery= `SELECT stu.*, cls.cls_name
FROM students_master AS stu

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


router.post('/feeslogdata', async (req, res) => {
  console.log("Received data:", req.body);
  const { stu_id, stu_name, payingfee, discount, remainingfee, feedate, paymentMethod } = req.body;

  try {
    // Start a transaction
    await db.query('START TRANSACTION');

    // Fetch the current fee-related data for the student
    const [studentData] = await db.query(`
      SELECT tution_fees, bookingfees, pending_fees, payingfees, discount 
      FROM students_master 
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
      UPDATE students_master 
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

router.post('/ecafeeslogdata', async (req, res) => {
  const { stu_id,stu_name, payingfee, feedate, payment_method } = req.body;

  try {
      // Start a transaction
      await db.query('START TRANSACTION');

      // Fetch the existing payingfee and vanfees from students_master
      const [existingData] = await db.query(
          'SELECT ecapayFees,eca_fees FROM students_master WHERE stu_id = ?',
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
      const updateQuery = `UPDATE students_master SET ecapayFees = ?, ecaRemaningFees = ? WHERE stu_id = ?`;
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



router.post('/vanfeeslogdata', async (req, res) => {
  const { stu_id,stu_name, payingfee, feedate, payment_method } = req.body;

  try {
      // Start a transaction
      await db.query('START TRANSACTION');

      // Fetch the existing payingfee and vanfees from students_master
      const [existingData] = await db.query(
          'SELECT vanpayFees, van FROM students_master WHERE stu_id = ?',
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
      const updateQuery = `UPDATE students_master SET vanpayFees = ?, vanRemaningFees = ? WHERE stu_id = ?`;
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



router.post('/schemefeeslogdata', async (req, res) => {
  const { stu_id,stu_name, payingfee, feedate, payment_method } = req.body;

  try {
      // Start a transaction
      await db.query('START TRANSACTION');

      // Fetch the existing payingfee and vanfees from students_master
      const [existingData] = await db.query(
          'SELECT schemepayFees, scheme FROM students_master WHERE stu_id = ?',
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
      const updateQuery = `UPDATE students_master SET schemepayFees = ?, schemeRemaningFees = ? WHERE stu_id = ?`;
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


router.get('/feesslipprint/:feeslogid', async (req, res) => {
  try {
    const feeslogid = req.params.feeslogid;
    console.log(feeslogid);
    const getQuery = `
      SELECT col.*, stu.cls_id, cls.cls_name 
      FROM collect_fee AS col
      INNER JOIN students_master AS stu ON col.stu_id = stu.stu_id
      INNER JOIN class AS cls ON stu.cls_id = cls.cls_id
      WHERE feeslogid = ?`; // Assuming 'id' is the primary key in collect_fee

    const [results] = await db.query(getQuery, [feeslogid]);

    if (results.length === 0) {
      return res.status(404).json({ message: "Fees log data not found." });
    } else {
      return res.status(200).json(results[0]); // Return the first result
    }
  } catch (error) {
    console.error("Error fetching Fees log data:", error);
    return res.status(500).json({ message: "Internal server error." });
  }
});

router.get('/ecafeesslipprint/:feeslogid', async (req, res) => {
  console.log("getslip");
  
  try {
    const feeslogid = req.params.feeslogid;
    console.log(feeslogid);
    const getQuery = `
      SELECT col.*, stu.cls_id, cls.cls_name 
      FROM ecacollect_fee AS col
      INNER JOIN students_master AS stu ON col.stu_id = stu.stu_id
      INNER JOIN class AS cls ON stu.cls_id = cls.cls_id
      WHERE feeslogid = ?`; // Assuming 'id' is the primary key in collect_fee

    const [results] = await db.query(getQuery, [feeslogid]);

    if (results.length === 0) {
      return res.status(404).json({ message: "Fees log data not found." });
    } else {
      return res.status(200).json(results[0]); // Return the first result
    }
  } catch (error) {
    console.error("Error fetching Fees log data:", error);
    return res.status(500).json({ message: "Internal server error." });
  }
});

router.get('/vanfeesslipprint/:feeslogid', async (req, res) => {
  console.log("getslip");
  
  try {
    const feeslogid = req.params.feeslogid;
    console.log(feeslogid);
    const getQuery = `
      SELECT col.*, stu.cls_id, cls.cls_name 
      FROM vancollect_fee AS col
      INNER JOIN students_master AS stu ON col.stu_id = stu.stu_id
      INNER JOIN class AS cls ON stu.cls_id = cls.cls_id
      WHERE feeslogid = ?`; // Assuming 'id' is the primary key in collect_fee

    const [results] = await db.query(getQuery, [feeslogid]);

    if (results.length === 0) {
      return res.status(404).json({ message: "Fees log data not found." });
    } else {
      return res.status(200).json(results[0]); // Return the first result
    }
  } catch (error) {
    console.error("Error fetching Fees log data:", error);
    return res.status(500).json({ message: "Internal server error." });
  }
});


router.get('/schemefeesslipprint/:feeslogid', async (req, res) => {
  console.log("getslip");
  
  try {
    const feeslogid = req.params.feeslogid;
    console.log(feeslogid);
    const getQuery = `
      SELECT col.*, stu.cls_id, cls.cls_name 
      FROM schemecollect_fee AS col
      INNER JOIN students_master AS stu ON col.stu_id = stu.stu_id
      INNER JOIN class AS cls ON stu.cls_id = cls.cls_id
      WHERE feeslogid = ?`; // Assuming 'id' is the primary key in collect_fee

    const [results] = await db.query(getQuery, [feeslogid]);

    if (results.length === 0) {
      return res.status(404).json({ message: "Fees log data not found." });
    } else {
      return res.status(200).json(results[0]); // Return the first result
    }
  } catch (error) {
    console.error("Error fetching Fees log data:", error);
    return res.status(500).json({ message: "Internal server error." });
  }
});

router.get('/feesslip/:stu_id', async (req, res) => {
  try {
    const stu_id = req.params.stu_id;
    const getQuery = `SELECT col.* ,cls.cls_id,FROM collect_fee WHERE stu_id = ?`;

    const [results] = await db.query(getQuery, [stu_id]);

    if (results.length === 0) {
      return res.status(404).json({ message: "Fees log data not found." });
    } else {
      return res.status(200).json(results); // Return only the first (and only) result
    }
  } catch (error) {
    console.error("Error fetching Fees log data:", error);
    return res.status(500).json({ message: "Internal server error." });
  }
});


  return router;
};