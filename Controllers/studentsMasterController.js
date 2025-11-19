const express = require("express");
const router = express.Router();
const moment = require("moment");
const multer = require("multer");
const cors = require("cors");
const currentDate = moment().format("YYYY-MM-DD HH:mm:ss");
module.exports = (db, upload) => {

  router.use(cors());
  router.post("/saveStudents", upload.single("stu_img"), async (req, res) => {


    console.log("runnn");
    try {
      const {
        staff_id,
        cls_id,
        scheme,
        stu_name,
        stu_aadhar,
        gender,
        dob,
        van,
        community,
        cast_name,
        religion,
        father_name,
        father_mobile,
        father_occupation,
        father_annual_income,
        mother_name,
        mother_mobile,
        mother_occupation,
        mother_annual_income,
        address,
      } = req.body;

      const stu_img = req.file ? req.file.filename : null;

      if (
        !staff_id ||
        !cls_id ||
        
        !stu_name ||
        !stu_aadhar ||
        !gender ||
        !dob ||
        !van ||
        !community ||
        !cast_name ||
        !religion ||
        !father_name ||
        !father_mobile ||
        !father_occupation ||
        !father_annual_income ||
        !mother_name ||
        !mother_mobile ||
        !mother_occupation ||
        !mother_annual_income ||
        !address ||
        !stu_img
      ) {
        return res.status(400).json({ message: "All fields are required." });
      }

      const existingStudentQuery = `SELECT * FROM students_master WHERE stu_aadhar = ?`;
      const [existingStudentResult] = await db.query(existingStudentQuery, [
        stu_aadhar,
      ]);

      if (existingStudentResult.length > 0) {
        return res
          .status(400)
          .json({
            message: "Student already exists with the same Aadhar number.",
          });
      }

      const apply_date = moment().format("YYYY-MM-DD");

      const saveQuery = `
              INSERT INTO students_master 
              (staff_id, cls_id, scheme, stu_name, stu_aadhar, stu_img, gender, dob,van, community, cast_name, religion, 
              father_name, father_mobile, father_occupation, father_annual_income, mother_name, mother_mobile, 
              mother_occupation, mother_annual_income, address, apply_date, created_at) 
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?,?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `;

      const saveParams = [
        staff_id,
        cls_id,
        scheme,
        stu_name,
        stu_aadhar,
        stu_img,
        gender,
        dob,
        van,
        community,
        cast_name,
        religion,
        father_name,
        father_mobile,
        father_occupation,
        father_annual_income,
        mother_name,
        mother_mobile,
        mother_occupation,
        mother_annual_income,
        address,
        apply_date,
        currentDate,
      ];

      const [results] = await db.query(saveQuery, saveParams);

      if (results.affectedRows === 1) {
        return res
          .status(200)
          .json({ message: "Student data saved successfully." });
      } else {
        return res
          .status(500)
          .json({ message: "Failed to save student data." });
      }
    } catch (err) {
      console.log("Error saving student data:", err);
      return res.status(500).json({ message: "Internal server error." });
    }
  });

  router.get("/getStudentsReg", async (req, res) => {
    try {
      const getQuery = `select students_master.*,staff.staff_name,cls.cls_name, from students_master inner join staffs_master staff on staff.staff_id = students_master.staff_id inner join class cls on students_master.cls_id = cls.cls_id 
          inner join sections sec on students_master.sec_id = sec.sec_id where students_master.isAllocated = 0 `;
      const [results] = await db.query(getQuery);
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

  router.get("/getStudents", async (req, res) => {
    try {
      const getQuery = `select * from students_master`;
      const [results] = await db.query(getQuery);
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
  router.get("/getStudentsCount", async (req, res) => {
    try {
      // Query to fetch count of students
      const countQuery = `SELECT COUNT(*) AS total_count FROM students_master`;
      
      // Execute the query
      const [results] = await db.query(countQuery);
  
      // Extract total_count from results
      const total_count = results[0].total_count;
  
      // Return response with count
      return res.status(200).json({ total_count });
    } catch (error) {
      console.error("Error fetching Students count:", error);
      return res.status(500).json({ message: "Internal server error." });
    }
  });
  


  router.put("/updateStudent/:id", async (req, res) => {
    try {
        const stuId = req.params.id;
        const {
            stu_name,
            aadhar_no,
            gender,
            dob,
            date_of_join,
            cls_id,
            community,
            father_name,
            father_mobile,
            mother_name,
            mother_mobile,
            bookingfees,
            address,
            Totalfees
        } = req.body;

        const updateQuery = `
            UPDATE students_master 
            SET 
                stu_name = ?, 
                stu_aadhar = ?, 
                gender = ?, 
                dob = ?, 
                date_of_join = ?, 
                cls_id = ?, 
                community = ?, 
                father_name = ?, 
                father_mobile = ?, 
                mother_name = ?, 
                mother_mobile = ?, 
                bookingfees = ?, 
                address = ?, 
                total_fees = ?
            WHERE stu_id = ?
        `;

        const [results] = await db.query(updateQuery, [
            stu_name,
            aadhar_no,
            gender,
            dob,
            date_of_join,
            cls_id,
            community,
            father_name,
            father_mobile,
            mother_name,
            mother_mobile,
            bookingfees,
            address,
            Totalfees,
            stuId
        ]);

        if (results.affectedRows === 0) {
            return res.status(404).json({ message: "Student data not found or no data updated" });
        } else {
            return res.status(200).json({ message: "Student data updated successfully." });
        }
    } catch (err) {
        console.log("Error updating student data:", err);
        return res.status(500).json({ message: "Internal server error." });
    }
});

  router.delete("/deleteStudent/:stuId", async (req, res) => {
    try {
      const stuId = req.params.stuId;
      if (!stuId) {
        return res.status(400).json({ message: "Student ID is required." });
      }
      const deleteQuery = `delete from students_master where stu_id = ?`;
      const [results] = await db.query(deleteQuery, [stuId]);
      if (results.affectedRows === 0) {
        return res
          .status(404)
          .json({ message: "Student data not found or no data deleted" });
      } else {
        return res
          .status(200)
          .json({ message: "Student data deleted successfully." });
      }
    } catch (err) {
      console.log("Error deleting staff data :", err);
      return res.status(500).json({ message: "Internal server error." });
    }
  });

  
  


  router.get("/getSiblings", async (req, res) => {
    try {
        const getQuery = `SELECT 
    sm1.*
FROM 
    students_master sm1
JOIN 
    students_master sm2 ON sm1.mother_mobile = sm2.mother_mobile 
                        AND sm1.mother_name = sm2.mother_name 
                        AND sm1.father_name = sm2.father_name 
                        AND sm1.father_mobile = sm2.father_mobile 
                        AND sm1.stu_id != sm2.stu_id
ORDER BY 
    sm1.stu_id ASC`;

                
        const [getResult] = await db.query(getQuery);
        
        const siblingsCount = getResult.length;
        
        if (siblingsCount > 0) {
            const convertData = getResult.map((result)=>({
                ...result,
                stu_img :`http://localhost:3001/uploads/${result.stu_img}`,
            }))
            res.status(200).json({ siblingsCount, siblingsData: convertData });
        } else {
            // No siblings found
            res.status(200).json({ siblingsCount: 0, siblingsData: [] });
        }
    } catch (err) {
        console.log("Error fetching siblings data:", err);
        res.status(500).json({ message: "Internal server error" });
    }
});

router.post('/studentsattenance', async (req, res) => {
  try {
      const { stu_id, status, cls_id, date,staff_id } = req.body;

      // Format date as YYYY-MM-DD for MySQL DATE format
      // const date = new Date(dates).toISOString().slice(0, 10);

      console.log(stu_id)
      console.log(status)
      console.log(cls_id)
      console.log(date)
      console.log(staff_id)


      const params = [stu_id, status, cls_id, date,staff_id];
      const postQuery = `INSERT INTO students_attendance (stu_id, status, cls_id,  date,staff_id) VALUES (?, ?, ?, ?,?)`;

      const [results] = await db.query(postQuery, params);

      if (results.affectedRows === 1) {
          return res.status(200).json({ message: "Student data saved successfully." });
      } else {
          return res.status(500).json({ message: "Failed to save student data." });
      }
  } catch (err) {
      console.log("Error saving student data:", err);
      return res.status(500).json({ message: "Internal server error." });
  }
});


router.get(`/detailattenance/:staff_id`,async(req,res)=>{
try{
  const staff_id= req.params.staff_id
  const getQuery = 'select stu.stu_id,stu.date,stu.status,stum.stu_name from students_attendance as stu right join students_master as stum on stu.stu_id = stum.stu_id where stu.staff_id =? '
  const [results] = await db.query(getQuery,staff_id);
  if (results.length == 0) {
    return res.status(404).json({ message: "Students data not found." });
  } else {
   
    
    return res.status(200).json(results);
  }
} catch (error) {
  console.error("Error fetching Students data:", error);
  return res.status(500).json({ message: "Internal server error." });
}

})
router.post('/saveStudentMarks', async (req, res) => {
  const { body } = req;
  console.log(req.body);

  if (!Array.isArray(body) || body.length === 0) {
    return res.status(400).json({ error: 'Invalid request body' });
  }

  try {
    // Construct the SQL WHERE clause dynamically
    const conditions = body.map(student => `(stu_id = ${student.stu_id} AND exam_id = ${student.exam_id})`).join(' OR ');
    const checkSql = `SELECT stu_id, exam_id FROM examsandmarks WHERE ${conditions}`;

    // Use the promise-based API for querying
    const [results] = await db.query(checkSql);

    const existingRecords = results.map(result => `${result.stu_id}-${result.exam_id}`);
    const newRecords = body.filter(student => !existingRecords.includes(`${student.stu_id}-${student.exam_id}`));

    if (newRecords.length === 0) {
      return res.status(200).json({ error: 'All records already exist' });
    }

    // Insert or update the new records
    const values = newRecords.map(student => [
      student.stu_id,
      student.stu_name,
      student.examname,
      student.tamil !== undefined ? student.tamil : null,
      student.english !== undefined ? student.english : null,
      student.maths !== undefined ? student.maths : null,
      student.science !== undefined ? student.science : null,
      student.social !== undefined ? student.social : null,
      student.total !== undefined ? student.total : 0,
      student.exam_id
    ]);

    const insertSql = `
      INSERT INTO examsandmarks (stu_id, stu_name, examname, tamil, english, maths, science, social, total, exam_id)
      VALUES ?
      ON DUPLICATE KEY UPDATE
        stu_name = VALUES(stu_name),
        examname = VALUES(examname),
        tamil = VALUES(tamil),
        english = VALUES(english),
        maths = VALUES(maths),
        science = VALUES(science),
        social = VALUES(social),
        total = VALUES(total)
    `;

    // Execute the insert query
    const [insertResult] = await db.query(insertSql, [values]);
    
    console.log('Number of records inserted/updated: ' + insertResult.affectedRows);

    if (newRecords.length < body.length) {
      return res.status(200).json({ message: 'Some records were already saved, and the remaining were saved successfully.' });
    } else {
      return res.status(200).json({ message: 'Marks saved successfully' });
    }

  } catch (err) {
    console.error('Error processing request:', err);
    return res.status(500).json({ error: 'Failed to save marks' });
  }
});




router.get(`/examname`,async(req,res)=>{
  try{
    const getQuery=`select  from examsandmarks `
   
    const [results] = await db.query(getQuery);
    if (results.length == 0) {
      return res.status(404).json({ message: "Students data not found." });
    } else {
     
      
      return res.status(200).json(results);
    }
  } catch (error) {
    console.error("Error fetching Students data:", error);
    return res.status(500).json({ message: "Internal server error." });
  }
  
  })


  router.get('/getexamsalloc', async(req, res) => {
    
    try{
     
      const getQuery = 'select * from exam_s '
      const [results] = await db.query(getQuery);
      if (results.length == 0) {
        return res.status(404).json({ message: "Students data not found." });
      } else {
       
        
        return res.status(200).json(results);
      }
    } catch (error) {
      console.error("Error fetching Students data:", error);
      return res.status(500).json({ message: "Internal server error." });
    }
    
    })



    router.put('/updateExamData', async (req, res) => {
      const { stu_id, exam_id, ...updatedFields } = req.body;
      console.log(req.body);
      
    
      if (!stu_id || !exam_id) {
        return res.status(400).json({ error: 'stu_id and exam_id are required' });
      }
    
      try {
        const updateFields = Object.keys(updatedFields)
          .map(key => `${key} = ?`)
          .join(', ');
    
        const updateValues = Object.values(updatedFields);
    
        const updateSql = `
          UPDATE examsandmarks
          SET ${updateFields}
          WHERE stu_id = ? AND exam_id = ?
        `;
    
        const [result] = await db.query(updateSql, [...updateValues, stu_id, exam_id]);
    
        if (result.affectedRows > 0) {
          res.status(200).json({ success: true, message: 'Data updated successfully' });
        } else {
          res.status(400).json({ success: false, message: 'No matching record found to update' });
        }
      } catch (error) {
        console.error('Error updating exam data:', error);
        res.status(500).json({ error: 'Failed to update exam data' });
      }
    });

  router.get('/examdata/:exam_id', async (req, res) => {
    try {
      const exam_id = req.params.exam_id;
      const staff_id = req.query.staff_id; // Get the staff_id from query params
  
      const getQuery = `
        SELECT e.*
        FROM examsandmarks e
        JOIN students_master s ON e.stu_id = s.stu_id
        WHERE e.exam_id = ? AND s.staff_id = ?
      `;
      const [results] = await db.query(getQuery, [exam_id, staff_id]); // Pass exam_id and staff_id as an array
  
      if (results.length === 0) {
        return res.status(404).json({ message: "Exam data not found." });
      } else {
        return res.status(200).json(results);
      }
    } catch (error) {
      console.error("Error fetching back exam data:", error);
      return res.status(500).json({ message: "Internal server error." });
    }
  });
  


  router.get('/vanattenance/:staff_id', async (req, res) => {
    const { staff_id } = req.params;
    
    console.log(`Fetching students for staff_id: ${staff_id}`);
    
    try {
        const getQuery = `
            SELECT stu_id, stu_name, van, cls_id, staff_id 
            FROM students_master 
            WHERE staff_id = ? AND van_student = 'yes'
        `;
        
        const [results] = await db.query(getQuery, [staff_id]);

        if (results.length === 0) {
            console.warn(`No students found for staff_id: ${staff_id}`);
            return res.status(404).json({ message: "Students data not found." });
        } else {
            return res.status(200).json(results);
        }
    } catch (error) {
        console.error("Error fetching van Students data:", error);
        return res.status(500).json({ message: "Internal server error." });
    }
});




  
router.post('/vanattenancepost', async (req, res) => {
  const { staff_id, stu_name, stu_id, cls_id, thatdate, statusn } = req.body;
  console.log(staff_id,stu_name,stu_id,cls_id,thatdate, statusn);
  

  try {
      const query = `
          INSERT INTO van_attenance (stu_id, cls_id, thatdate, statusn, staff_id, stu_name)
          VALUES (?, ?, ?, ?, ?, ?)
      `;
      const [results] = await db.query(query, [stu_id, cls_id, thatdate, statusn, staff_id, stu_name]);

      if (results.affectedRows === 1) {
          return res.status(200).json({ message: "Student data saved successfully." });
      } else {
          return res.status(500).json({ message: "Failed to save student data." });
      }
  } catch (err) {
      console.log("Error saving student data:", err);
      return res.status(500).json({ message: "Internal server error." });
  }
});



router.get(`/vanattenancedetails/:staff_id`,async(req,res)=>{
  try{
    const staff_id =req.params.staff_id
    const getQuery= `select * from van_attenance where staff_id =?`
    const [results]= await db.query(getQuery,staff_id)
    if (results.length == 0) {
      return res.status(404).json({ message: "vanStudents data not found." });
    } else {
     
      
      return res.status(200).json(results);
    }
  } catch (error) {
    console.error("Error fetching van Students  data:", error);
    return res.status(500).json({ message: "Internal server error." });
  }
  
  })


  router.get('/studentscount', async (req, res) => {
    try {
      const sql = `
        SELECT YEAR(apply_date) AS year, COUNT(*) AS student_count
        FROM students_master
        GROUP BY YEAR(apply_date)
        ORDER BY YEAR(apply_date)
      `;
  
      const [results]= await db.query(sql)
      if (results.length == 0) {
        return res.status(404).json({ message: "vanStudents data not found." });
      } else {
       
        
        return res.status(200).json(results);
      }
    } catch (error) {
      console.error("Error fetching van Students  data:", error);
      return res.status(500).json({ message: "Internal server error." });
    }
    
    })
  // ==================================new changes====================================


  router.post('/enquirystudents', (req, res) => {
    
    const data = req.body;
    console.log(data);
    const sql = 'INSERT INTO student_enquiry (class, student_name, date_of_birth, gender, father_name, father_mobile, mother_name, mother_mobile, address, aadhar_no, community,enquiry_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
    db.query(sql, [data.cls_id, data.stu_name, data.dob, data.gender, data.father_name, data.father_mobile, data.mother_name, data.mother_mobile, data.address, data.stu_aadhar, data.community,data.enquiry_date], (err, result) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.status(201).json({ message: 'Student enquiry saved successfully!', id: result.insertId });
        return res
    });
});

router.get("/getEnquiryStudents", async (req, res) => {
  try {
    const getQuery = `SELECT * FROM student_enquiry`;
    const [results] = await db.query(getQuery);
    if (results.length === 0) {
      return res.status(404).json({ message: "Students data not found." });
    }
    return res.status(200).json(results);
  } catch (error) {
    console.error("Error fetching Students data:", error);
    return res.status(500).json({ message: "Internal server error." });
  }
});

router.delete("/deleteEnquiryStudent/:id", async (req, res) => {
  try {
    const stuId = req.params.id;  // Correctly extract the parameter
    console.log("Received student ID for deletion:", stuId);  // Debug log
    if (!stuId) {
      return res.status(400).json({ message: "Student ID is required." });
    }
    const deleteQuery = `DELETE FROM student_enquiry WHERE id = ?`;
    const [results] = await db.query(deleteQuery, [stuId]);
    if (results.affectedRows === 0) {
      return res.status(404).json({ message: "Student data not found or no data deleted" });
    } else {
      return res.status(200).json({ message: "Student data deleted successfully." });
    }
  } catch (err) {
    console.log("Error deleting student data :", err);
    return res.status(500).json({ message: "Internal server error." });
  }
});

router.put("/updateEnquiryStudent/:id", async (req, res) => {
  try {
    const stuId = req.params.id;
    console.log(stuId);
    const {
      student_name,
      aadhar_no,
      gender,
      date_of_birth,
      class: classId,
      community,
      father_name,
      father_mobile,
      mother_name,
      mother_mobile,
      address,
    } = req.body;

    const updateQuery = `
      UPDATE student_enquiry
      SET 
        student_name = ?, 
        aadhar_no = ?, 
        gender = ?, 
        date_of_birth = ?, 
        class = ?, 
        community = ?, 
        father_name = ?, 
        father_mobile = ?, 
        mother_name = ?, 
        mother_mobile = ?, 
        address = ?
      WHERE id = ?
    `;

    const [results] = await db.query(updateQuery, [
      student_name,
      aadhar_no,
      gender,
      date_of_birth,
      classId,
      community,
      father_name,
      father_mobile,
      mother_name,
      mother_mobile,
      address,
      stuId,
    ]);

    if (results.affectedRows === 0) {
      return res.status(404).json({ message: "Student data not found or no data updated" });
    } else {
      return res.status(200).json({ message: "Student data updated successfully." });
    }
  } catch (err) {
    console.log("Error updating student data:", err);
    return res.status(500).json({ message: "Internal server error." });
  }
});

router.post('/bookingstudents', async (req, res) => {
  const data = req.body;
  console.log(data);
  

  const sqlBooking = `INSERT INTO student_booking 
    (class, student_name, dob, gender, date_of_join, father_name, father_mobile, mother_name, mother_mobile, address, aadhar_no, community, bookingfees) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

  const sqlEnquiryUpdate = `UPDATE student_enquiry 
                            SET confirm = 'yes' 
                            WHERE id = ?`;

  try {
    // Execute the first query for booking
    await db.query(sqlBooking, [
      data.cls_id, 
      data.stu_name, 
      data.dob, 
      data.gender, 
      data.doj, 
      data.father_name, 
      data.father_mobile, 
      data.mother_name, 
      data.mother_mobile, 
      data.address, 
      data.stu_aadhar, 
      data.community, 
      data.Bookingfees
    ]);

    // If the booking is successful, update the student_enquiry table
    await db.query(sqlEnquiryUpdate, [data.enquiry_id]);

    return res.status(200).json({ message: "Data added and enquiry confirmed successfully." });
  } catch (err) {
    console.log("Error:", err);
    return res.status(500).json({ message: "Internal server error." });
  }
});



router.get("/getBookingStudents", async (req, res) => {
  try {
    const getQuery = `SELECT * FROM student_booking`;
    const [results] = await db.query(getQuery);
    if (results.length === 0) {
      return res.status(404).json({ message: "Students data not found." });
    }
    return res.status(200).json(results);
  } catch (error) {
    console.error("Error fetching Students data:", error);
    return res.status(500).json({ message: "Internal server error." });
  }
});
router.delete("/deleteBookingStudent/:id", async (req, res) => {
  try {
    const stuId = req.params.id;  // Correctly extract the parameter
    console.log("Received student ID for deletion:", stuId);  // Debug log
    if (!stuId) {
      return res.status(400).json({ message: "Student ID is required." });
    }
    const deleteQuery = `DELETE FROM student_booking WHERE id = ?`;
    const [results] = await db.query(deleteQuery, [stuId]);
    if (results.affectedRows === 0) {
      return res.status(404).json({ message: "Student data not found or no data deleted" });
    } else {
      return res.status(200).json({ message: "Student data deleted successfully." });
    }
  } catch (err) {
    console.log("Error deleting student data :", err);
    return res.status(500).json({ message: "Internal server error." });
  }
});


router.put('/updateBookingStudent/:id', async (req, res) => {
  try {
      const { id } = req.params;
      console.log(id);
      const {
          cls_id,
          stu_name,
          stu_aadhar,
          gender,
          dob,
          doj,
          community,
          father_name,
          father_mobile,
          mother_name,
          mother_mobile,
          Bookingfees,
          address,
      } = req.body;

      const updateQuery = `
          UPDATE student_booking 
          SET class = ?, student_name = ?, stu_aadhar = ?, gender = ?, dob = ?, 
              date_of_join = ?, community = ?, father_name = ?, father_mobile = ?, 
              mother_name = ?, mother_mobile = ?, Bookingfees = ?, address = ? 
          WHERE id = ?
      `;

      const [results] = await db.query(updateQuery, [
          cls_id,
          stu_name,
          stu_aadhar,
          gender,
          dob,
          doj,
          community,
          father_name,
          father_mobile,
          mother_name,
          mother_mobile,
          Bookingfees,
          address,
          id,
      ]);

      if (results.affectedRows === 0) {
          res.status(404).json({ message: 'Student booking not found or no changes made.' });
      } else {
          res.status(200).json({ message: 'Student booking updated successfully.' });
      }
  } catch (err) {
      console.error('Error updating student booking:', err);
      res.status(500).json({ message: 'Internal server error.' });
  }
});
// ============================================================
router.post('/addstudents', async (req, res) => {
  const data = req.body; // Student data sent from the frontend
  console.log('Received data:', data);

  const apply_date = moment().format("YYYY-MM-DD");

  // Queries
  const fetchClassFeesQuery = `
    SELECT tution_fees, firstinstallment, secondinstallment
    FROM class
    WHERE cls_id = ?`;

  const insertStudentQuery = `
    INSERT INTO students_master
      (cls_id, stu_name, gender, dob, stu_aadhar, community, father_name, father_mobile, mother_name, mother_mobile, address, bookingfees, tution_fees, firstinstallment, secondinstallment, pending_fees, date_of_join, apply_date,academic_year)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

  const confirmBookingQuery = `
    UPDATE student_booking
    SET confirm = 'yes'
    WHERE id = ?`;

  try {
    // Step 1: Fetch class fees based on cls_id
    const [classFees] = await db.query(fetchClassFeesQuery, [data.cls_id]);

    // Debugging: Check the class fees data
    console.log('Class Fees fetched:', classFees);

    if (!classFees || classFees.length === 0) {
      return res.status(404).json({ message: "Class fees not found. Please allocate fees for this class first." });
    }

    const { tution_fees, firstinstallment, secondinstallment } = classFees[0]; // Assuming classFees is an array, so we access the first item

    // Debugging: Log the individual fee values
    console.log('Received Tuition Fees:', tution_fees);
    console.log('Received First Installment:', firstinstallment);
    console.log('Received Second Installment:', secondinstallment);

    // Step 2: Calculate pending fees
    const pending_fees = (tution_fees || 0) - (data.Bookingfees || 0);

    // Step 3: Insert the student data into students_master table
    await db.query(insertStudentQuery, [
      data.cls_id,
      data.stu_name,
      data.gender,
      data.dob,
      data.stu_aadhar,
      data.community,
      data.father_name,
      data.father_mobile,
      data.mother_name,
      data.mother_mobile,
      data.address,
      data.Bookingfees || 0,
      tution_fees || 0,
      firstinstallment || 0,
      secondinstallment || 0,
      pending_fees, // Add calculated pending fees here
      data.doj,
      apply_date,
      data.academic_year 
    ]);

    // Step 4: Mark the student booking as confirmed
    await db.query(confirmBookingQuery, [data.stu_id]);

    return res.status(200).json({ message: "Student added successfully, pending fees calculated, and booking confirmed!" });
  } catch (err) {
    console.error("Error:", err);
    return res.status(500).json({ message: "An error occurred while adding the student." });
  }
});

// ======================================================================

router.get("/getAllStudents", async (req, res) => {
  try {
    const getQuery = `SELECT * FROM students_master`;
    const [results] = await db.query(getQuery);
    if (results.length === 0) {
      return res.status(404).json({ message: "Students data not found." });
    }
    return res.status(200).json(results);
  } catch (error) {
    console.error("Error fetching Students data:", error);
    return res.status(500).json({ message: "Internal server error." });
  }
});

router.get("/getAllpendingStudents", async (req, res) => {
  try {
    // SQL query to select students with at least one non-zero or non-null fee
    const getQuery = `
      SELECT * FROM students_master
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

return router;
 
};
