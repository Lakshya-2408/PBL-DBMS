const express = require('express');
const mysql = require('mysql2');
const path = require('path');
const bodyParser = require('body-parser');

const app = express();
const port = 8081;

app.set('view engine', 'ejs');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'mysql123',
    database: 'employee_management'
});

db.connect((err) => {
    if (err) {
        console.error('MySQL connection error:', err);
        return;
    }
    console.log('Connected to MySQL database');
});

const createTableQuery = `
    CREATE TABLE IF NOT EXISTS employees (
        id INT AUTO_INCREMENT PRIMARY KEY,
        employee_id VARCHAR(20) UNIQUE NOT NULL,
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        phone VARCHAR(20),
        date_of_birth DATE,
        gender ENUM('male', 'female', 'other'),
        address TEXT,
        department VARCHAR(100) NOT NULL,
        position VARCHAR(100) NOT NULL,
        employment_type ENUM('full-time', 'part-time', 'contract', 'intern') NOT NULL,
        start_date DATE NOT NULL,
        salary DECIMAL(10,2),
        username VARCHAR(100) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        permissions ENUM('employee', 'manager', 'admin') DEFAULT 'employee',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
`;

db.query(createTableQuery, (err) => {
    if (err) {
        console.error('Error creating table:', err);
    } else {
        console.log('Employees table ready');
    }
});

app.get('/', (req, res) => {
    res.render('home');
});

app.get('/adminlogin', (req, res) => {
    res.render('adminlogin');
});

app.get('/emplogin', (req, res) => {
    res.render('emplogin');
});

app.get('/admin', (req, res) => {
    res.render('admin');
});

app.get('/addemployee', (req, res) => {
    res.render('addemployee');
});

app.get('/employees', (req, res) => {
    res.render('employee');
});

app.post('/add-employee', (req, res) => {
    const {
        employeeId,
        firstName,
        lastName,
        email,
        phone,
        dob,
        gender,
        address,
        department,
        position,
        employmentType,
        startDate,
        salary,
        username,
        password,
        permissions
    } = req.body;

    if (!employeeId || !firstName || !lastName || !email || !department || !position || !employmentType || !startDate || !username || !password) {
        return res.status(400).json({ 
            success: false, 
            message: 'All required fields must be filled' 
        });
    }

    const insertQuery = `
        INSERT INTO employees (
            employee_id, first_name, last_name, email, phone, date_of_birth, 
            gender, address, department, position, employment_type, 
            start_date, salary, username, password, permissions
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const values = [
        employeeId, firstName, lastName, email, phone, dob || null,
        gender || null, address || null, department, position, employmentType,
        startDate, salary || null, username, password, permissions || 'employee'
    ];

    db.query(insertQuery, values, (err, result) => {
        if (err) {
            console.error('MySQL insert error:', err);
            
            if (err.code === 'ER_DUP_ENTRY') {
                if (err.sqlMessage.includes('employee_id')) {
                    return res.status(400).json({ 
                        success: false, 
                        message: 'Employee ID already exists' 
                    });
                } else if (err.sqlMessage.includes('email')) {
                    return res.status(400).json({ 
                        success: false, 
                        message: 'Email already exists' 
                    });
                } else if (err.sqlMessage.includes('username')) {
                    return res.status(400).json({ 
                        success: false, 
                        message: 'Username already exists' 
                    });
                }
            }
            
            return res.status(500).json({ 
                success: false, 
                message: 'Database error: ' + err.message 
            });
        }

        res.json({ 
            success: true, 
            message: 'Employee added successfully',
            employeeId: result.insertId 
        });
    });
});

app.get('/edit-employee/:id', (req, res) => {
    const employeeId = req.params.id;
    
    const query = 'SELECT * FROM employees WHERE id = ?';
    db.query(query, [employeeId], (err, results) => {
        if (err) {
            console.error('MySQL select error:', err);
            return res.status(500).send('Database error');
        }
        
        if (results.length === 0) {
            return res.status(404).send('Employee not found');
        }
        
        res.render('edit-employee', { employee: results[0] });
    });
});

app.get('/api/employees', (req, res) => {
    const query = 'SELECT * FROM employees ORDER BY created_at DESC';
    
    db.query(query, (err, results) => {
        if (err) {
            console.error('MySQL select error:', err);
            return res.status(500).json({ 
                success: false, 
                message: 'Database error' 
            });
        }
        
        res.json({ 
            success: true, 
            employees: results 
        });
    });
});

app.get('/api/employees/:id', (req, res) => {
    const employeeId = req.params.id;
    
    const query = 'SELECT id, employee_id, first_name, last_name, email, phone, date_of_birth, gender, address, department, position, employment_type, start_date, salary, username, permissions FROM employees WHERE id = ?';
    
    db.query(query, [employeeId], (err, results) => {
        if (err) {
            console.error('MySQL select error:', err);
            return res.status(500).json({ 
                success: false, 
                message: 'Database error' 
            });
        }
        
        if (results.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'Employee not found' 
            });
        }
        
        res.json({ 
            success: true, 
            employee: results[0] 
        });
    });
});

app.put('/api/employees/:id', (req, res) => {
    const employeeId = req.params.id;
    const {
        firstName,
        lastName,
        email,
        phone,
        dob,
        gender,
        address,
        department,
        position,
        employmentType,
        startDate,
        salary,
        username,
        permissions
    } = req.body;

    const updateQuery = `
        UPDATE employees 
        SET first_name = ?, last_name = ?, email = ?, phone = ?, date_of_birth = ?, 
            gender = ?, address = ?, department = ?, position = ?, employment_type = ?,
            start_date = ?, salary = ?, username = ?, permissions = ?
        WHERE id = ?
    `;

    const values = [
        firstName, lastName, email, phone, dob || null,
        gender || null, address || null, department, position, employmentType,
        startDate, salary || null, username, permissions || 'employee', employeeId
    ];

    db.query(updateQuery, values, (err, result) => {
        if (err) {
            console.error('MySQL update error:', err);
            
            if (err.code === 'ER_DUP_ENTRY') {
                if (err.sqlMessage.includes('email')) {
                    return res.status(400).json({ 
                        success: false, 
                        message: 'Email already exists' 
                    });
                } else if (err.sqlMessage.includes('username')) {
                    return res.status(400).json({ 
                        success: false, 
                        message: 'Username already exists' 
                    });
                }
            }
            
            return res.status(500).json({ 
                success: false, 
                message: 'Database error: ' + err.message 
            });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'Employee not found' 
            });
        }

        res.json({ 
            success: true, 
            message: 'Employee updated successfully'
        });
    });
});

app.delete('/api/employees/:id', (req, res) => {
    const employeeId = req.params.id;
    
    const query = 'DELETE FROM employees WHERE id = ?';
    
    db.query(query, [employeeId], (err, result) => {
        if (err) {
            console.error('MySQL delete error:', err);
            return res.status(500).json({ 
                success: false, 
                message: 'Database error' 
            });
        }
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'Employee not found' 
            });
        }
        
        res.json({ 
            success: true, 
            message: 'Employee deleted successfully'
        });
    });
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
