const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const bodyParser = require('body-parser');
const multer = require('multer');
const path = require('path'); 
const dotenv=require('dotenv')

const app = express();

dotenv.config()

const PORT = process.env.PORT || 2001

app.use(cors(
  {
    origin:'https://dream-school-mng.netlify.app',
    methods:['GET','PUT','POST','DELETE'],
    credentials:true
  }
 ));
app.use(bodyParser.json());

app.use('./uploads', express.static(path.join(__dirname, 'uploads')),(err)=>{
    console.log("image ",err)
});

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, './uploads');
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '_' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '_' + uniqueSuffix);
    }
});

const storageExcel = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '_' + Math.round(Math.random() * 1E9);
        const extension = path.extname(file.originalname);
        cb(null, file.fieldname + '_' + uniqueSuffix + extension);
    }
});

const upload = multer({ storage: storage });
const uploadExcel = multer({storage: storageExcel});

const db = mysql.createPool({
    host:process.env.DB_HOST,
    port:process.env.DB_PORT || 3306,
    user:process.env.DB_USER,
    password:process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
     ssl: {
        rejectUnauthorized: true
    }
});

(async () => {
    try {
        const connection = await db.getConnection();
        console.log("Database is connected successfully.");
        connection.release();
    } catch (err) {
        console.log("Database is not connected.", err.message);
    }
})();
     

const departmentController = require('./Controllers/departmentController')(db);
app.use('/department', departmentController);

const roleController = require('./Controllers/roleController')(db);
app.use('/role', roleController);

const classAndSecController = require('./Controllers/classAndSecController')(db);
app.use('/clsAndSec', classAndSecController);

const staffsMasterController = require('./Controllers/staffsMasterController')(db, upload);
app.use('/staffs', staffsMasterController);

const studentsMasterController = require('./Controllers/studentsMasterController')(db, upload);
app.use('/students', studentsMasterController);

const studentsAllocationController = require('./Controllers/studentsAllocationController')(db, upload);
app.use('/stuAllocation', studentsAllocationController);

const feesAllocationController = require('./Controllers/feesAllocationController')(db, upload);
app.use('/feeAllocation', feesAllocationController);

const feesLogsController = require('./Controllers/feesLogsController')(db, upload);
app.use('/feeLogs', feesLogsController);

const discountController = require('./Controllers/discountController')(db, upload);
app.use('/discount', discountController);

const classTeacherAndAttenance = require('./Controllers/classTeacherAndAttenance')(db);
app.use('/attenance', classTeacherAndAttenance);

const subjectController = require('./Controllers/subjectController')(db);
app.use('/subject', subjectController);

const staffAllocationController = require('./Controllers/staffAllocationController')(db);
app.use('/staffAllocation', staffAllocationController);

const classTeacherController = require('./Controllers/classTeacherController')(db);
app.use('/clsTeach', classTeacherController);

const dashboardController = require('./Controllers/dashboardController')(db);
app.use('/dashboard', dashboardController);

const timeTableController = require('./Controllers/timeTableController')(db,upload);
app.use('/timeTable', timeTableController);

const studentsUploadExcelController = require('./Controllers/studentsUploadExcelController')(db,uploadExcel);
app.use('/upload', studentsUploadExcelController);

const academictyearcontroller = require('./Controllers/Academicyearcontroller')(db);
app.use('/academicyear', academictyearcontroller);

app.put('/allfeesalloc/:stu_id', async (req, res) => {
    const data = req.body;
    console.log('Received data:', data);
    try {
      const { tution_fees, transport_fees, additional_fees, firstinstallment, secondinstallment, discount, total_fees,pending_fees } = req.body;
      console.log(tution_fees);
      console.log(transport_fees);
      console.log(additional_fees);
      console.log(discount);
      console.log(total_fees);
  
      const stu_id = req.params.stu_id;
      const putQuery = `UPDATE students_master SET tution_fees = ?, transport_fees = ?, additional_fees = ?, firstinstallment = ?, secondinstallment = ?, discount = ?, total_fees = ?, pending_fees = ? WHERE stu_id = ?`;
      const [results] = await db.query(putQuery, [tution_fees, transport_fees, additional_fees, firstinstallment, secondinstallment, discount|| null, total_fees, pending_fees, stu_id]);
  
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

  app.post('/addVanStudent', async (req, res) => {
    console.log("Received data:", req.body);
    const { studentIds, vanFees } = req.body;
  
    if (!studentIds || !vanFees) {
      return res.status(400).json({ message: 'Student IDs and van fees are required' });
    }
  
    try {
      // Start a transaction
      await db.query('START TRANSACTION');
  
      // Update van fees, set van_student to 'yes' and set vanRemainingFees to vanFees for the provided student IDs
      const updateQuery = `UPDATE students_master SET van = ?, van_student = 'yes', vanRemaningFees = ? WHERE stu_id IN (?)`;
      const [result] = await db.query(updateQuery, [vanFees, vanFees, studentIds]);
  
      if (result.affectedRows === 0) {
        console.log("No rows updated");
        await db.query('ROLLBACK');
        return res.status(404).json({ message: 'No students found or updated' });
      }
  
      // Commit the transaction
      await db.query('COMMIT');
      console.log("Rows updated successfully");
      return res.status(201).json({ message: 'Students updated successfully' });
    } catch (error) {
      console.error("Error updating students:", error);
      await db.query('ROLLBACK'); // Rollback in case of error
      res.status(500).json({ message: 'Internal server error' });
    }
  });
  

  app.post('/addEcaStudent', async (req, res) => {
    console.log("Received data:", req.body);
    const { studentIds, ecaFees, activities } = req.body;
  
    if (!studentIds || !ecaFees || !activities) {
      return res.status(400).json({ message: 'Student IDs, ECA fees, and activities are required' });
    }
  
    try {
      // Start a transaction
      await db.query('START TRANSACTION');
  
      // Update ECA fees, set eca_student to 'yes', update activities, and set ecaRemainingFees to ecaFees for the provided student IDs
      const updateQuery = `
        UPDATE students_master
        SET eca_fees = ?, eca_student = 'yes', activities = ?, ecaRemaningFees = ?
        WHERE stu_id IN (?)
      `;
      const [result] = await db.query(updateQuery, [ecaFees, activities, ecaFees, studentIds]);
  
      if (result.affectedRows === 0) {
        console.log("No rows updated");
        await db.query('ROLLBACK');
        return res.status(404).json({ message: 'No students found or updated' });
      }
  
      // Commit the transaction
      await db.query('COMMIT');
      console.log("Rows updated successfully");
      return res.status(201).json({ message: 'Students updated successfully' });
    } catch (error) {
      console.error("Error updating students:", error);
      await db.query('ROLLBACK'); // Rollback in case of error
      res.status(500).json({ message: 'Internal server error' });
    }
  });
  

 
  app.post('/addschemeStudent', async (req, res) => {
    console.log("Received data:", req.body);
    const { studentIds, schemeFees } = req.body;
  
    if (!studentIds || !schemeFees) {
      return res.status(400).json({ message: 'Student IDs and scheme fees are required' });
    }
  
    try {
      // Start a transaction
      await db.query('START TRANSACTION');
  
      // Update scheme fees, set scheme_student to 'yes', and set schemeRemainingFees to schemeFees for the provided student IDs
      const updateQuery = `UPDATE students_master SET scheme = ?, scheme_student = 'yes', schemeRemaningFees = ? WHERE stu_id IN (?)`;
      const [result] = await db.query(updateQuery, [schemeFees, schemeFees, studentIds]);
  
      if (result.affectedRows === 0) {
        console.log("No rows updated");
        await db.query('ROLLBACK');
        return res.status(404).json({ message: 'No students found or updated' });
      }
  
      // Commit the transaction
      await db.query('COMMIT');
      console.log("Rows updated successfully");
      return res.status(201).json({ message: 'Students updated successfully' });
    } catch (error) {
      console.error("Error updating students:", error);
      await db.query('ROLLBACK'); // Rollback in case of error
      res.status(500).json({ message: 'Internal server error' });
    }
});



 

  app.put('/vanstudents/:id', async (req, res) => {
  const studentId = req.params.id;

  try {
      // Start a transaction
      await db.query('START TRANSACTION');
      
      // SQL query to update the student record
      const [result] = await db.query(
          'UPDATE students_master SET van_student = NULL, van = NULL WHERE stu_id = ?', 
          [studentId]
      );
      
      if (result.affectedRows === 0) {
          await db.query('ROLLBACK'); // Rollback if no record was found
          return res.status(404).json({ message: 'Student not found' });
      }

      // Commit the transaction
      await db.query('COMMIT');
      
      res.status(200).json({ message: 'Student updated successfully' });
  } catch (error) {
      console.error('Error updating student:', error);
      await db.query('ROLLBACK'); // Rollback in case of error
      res.status(500).json({ message: 'Internal Server Error' });
  }
});


  app.get('/vanstudents', async (req, res) => {
    try {
      const query = 'SELECT * FROM students_master WHERE van_student = "yes"';
      const [rows] = await db.query(query);
      res.status(200).json(rows);
    } catch (err) {
      console.log("Error fetching van students:", err);
      res.status(500).json({ message: "Internal server error." });
    }
  })

  app.get('/ecastudents', async (req, res) => {
    try {
      const query = 'SELECT * FROM students_master WHERE eca_student = "yes"';
      const [rows] = await db.query(query);
      res.status(200).json(rows);
    } catch (err) {
      console.log("Error fetching van students:", err);
      res.status(500).json({ message: "Internal server error." });
    }
  })


  app.put('/ecastudents/:id', async (req, res) => {
    const studentId = req.params.id;
  
    try {
        // Start a transaction
        await db.query('START TRANSACTION');
        
        // SQL query to update the student record
        const [result] = await db.query(
            'UPDATE students_master SET eca_student = NULL, eca_fees = NULL WHERE stu_id = ?', 
            [studentId]
        );
        
        if (result.affectedRows === 0) {
            await db.query('ROLLBACK'); // Rollback if no record was found
            return res.status(404).json({ message: 'Student not found' });
        }
  
        // Commit the transaction
        await db.query('COMMIT');
        
        res.status(200).json({ message: 'Student updated successfully' });
    } catch (error) {
        console.error('Error updating student:', error);
        await db.query('ROLLBACK'); // Rollback in case of error
        res.status(500).json({ message: 'Internal Server Error' });
    }
  });


  app.get('/schemestudents', async (req, res) => {
    try {
      const query = 'SELECT * FROM students_master WHERE scheme_student = "yes"';
      const [rows] = await db.query(query);
      res.status(200).json(rows);
    } catch (err) {
      console.log("Error fetching van students:", err);
      res.status(500).json({ message: "Internal server error." });
    }
  })

  app.put('/Schemestudents/:id', async (req, res) => {
    const studentId = req.params.id;
  
    try {
        // Start a transaction
        await db.query('START TRANSACTION');
        
        // SQL query to update the student record
        const [result] = await db.query(
            'UPDATE students_master SET scheme_student = NULL, scheme = NULL WHERE stu_id = ?', 
            [studentId]
        );
        
        if (result.affectedRows === 0) {
            await db.query('ROLLBACK'); // Rollback if no record was found
            return res.status(404).json({ message: 'Student not found' });
        }
  
        // Commit the transaction
        await db.query('COMMIT');
        
        res.status(200).json({ message: 'Student updated successfully' });
    } catch (error) {
        console.error('Error updating student:', error);
        await db.query('ROLLBACK'); // Rollback in case of error
        res.status(500).json({ message: 'Internal Server Error' });
    }
  });



// Fetch students by class ID
app.get('/students/:classId', async (req, res) => {
    const classId = req.params.classId;
    console.log([classId]);
    try {
      const [students] = await db.query('SELECT * FROM students_master WHERE cls_id = ?', [classId]);
      res.json(students);
    } catch (err) {
      console.error('Error fetching students:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });
  
  
  app.get('/fees/:stu_id', async (req, res) => {
    const stuId = req.params.stu_id;
    try {
      const [fees] = await db.query('SELECT * FROM collect_fee WHERE stu_id = ?', [stuId]);
      res.json(fees);
    } catch (err) {
      console.error('Error fetching fee details:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });
  
app.listen(PORT, () => {
    console.log(`Server is running on ${PORT}...`);
});
