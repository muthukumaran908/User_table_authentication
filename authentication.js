const express = require("express");
const app = express();
const bodyParser = require("body-parser");
//emailvalidation for correct mail_id
var validator = require("email-validator");
;
// Here we are configuring express to use body-parser as middle-ware.
app.use(bodyParser.urlencoded({
	"limit": '50mb',
	"extended": true
}));
app.use(bodyParser.json({
	limit: '50mb'
}));
var mysql = require('mysql');
//module for encrypt password
const bcrypt = require('bcrypt');
var mysqlConnection = mysql.createConnection({
	host: "localhost",
	user: process.env.user,
	password: process.env.password,
	database: "authentication"
});
//signup
app.post('/signup', (req, res) => {
	// code to perform particular action.
	// To access POST variable use req.body()methods.
	if (!!req.body.name && !!req.body.email && !!req.body.password) {
		var name = req.body.name;
		var email = req.body.email;
		var password = req.body.password;
		//emailvalidation for correct mail_id
		var valid_mail=validator.validate(email)
		if(valid_mail==true){
		
		new Promise(function(resolve, reject) {
			// fetch all email id for repeated email validation
			mysqlConnection.query(`select email from users`, function(err, email_validation) {
				if (!!err) {
					console.log(err);
					return;
				}
				resolve(email_validation)
			})
		}).then((email_validation) => {
			//  email validation with request email id
			const result = email_validation.filter(emails_val => emails_val.email == email);
			if (result.length > 0) {
				//mail id already exist
				res.status(200).json({
					warning: 'email id already exist!!!!'
				});
			} else {
				new Promise(function(resolve, reject) {
						bcrypt.genSalt(10, function(err, Salt) {
							// The bcrypt is used for encrypting password.
							bcrypt.hash(password, Salt, function(err, hash) {
								if (err) {
									return console.log('Cannot encrypt');
								} else {
									resolve(hash)
								}
							})
						})
					})
					.then((encrypt_password) => {
						new Promise(function(resolve, reject) {
							//insert user datas into table
							mysqlConnection.query(`insert into users set name='${name}', email = '${email}', password='${encrypt_password}'`, function(err, completed_status) {
								if (!!err) {
									console.log(err);
									return;
								}
								resolve(completed_status)
							})
						}).then((completed_status) => {
							new Promise(function(resolve, reject) {
								var user_id = completed_status.insertId;
								//by using id,all datas are fetch
								mysqlConnection.query(`select id,name,email,password,createdAt,updatedAt from users where id=${user_id}`, function(err, fetch_data) {
									if (!!err) {
										console.log(err);
										return;
									}
									resolve(fetch_data[0])
								})
							}).then((user_data) => {
								res.status(200).json({
									success: 'true',
									user: user_data
								});
							}).catch((err) => {
								res.status(200).json({
									success: 'false'
								});
							})
						})
					})
			}
		})
	}else{
		res.status(200).json({
			status: 0,
			msg: "Not a valid mail_id"
		});

	}
	} else {
		//if input field are missing
		res.status(200).json({
			status: 0,
			msg: "Insufficient inputs"
		});
	}
})
//login
app.post('/login', (req, res) => {
	// code to perform particular action.
	// To access POST variable use req.body()methods.
	if (!!req.body.password && !!req.body.email) {
		var password = req.body.password;
		var email = req.body.email;
		var randomstring = require('randomstring');
		new Promise(function(resolve, reject) {
			//fetch password for specific email
			mysqlConnection.query(`select * from users where email='${email}'`, function(err, password_status) {
				if (!!err) {
					console.log(err);
					return;
				}
				resolve(password_status[0])
			})
		}).then((password_status) => {
			//compare given password and existing encrypted password in DB
			bcrypt.compare(password, password_status.password, function(err, result) {
				if (result == true) {
					res.status(200).json({
						success: 'true',
						Token: randomstring.generate()
					})
				} else {
					res.status(200).json({
						success: 'false'
					})
				}
			});
		})
	} else {
		//if input field are missing
		res.status(200).json({
			status: 0,
			msg: "Insufficient inputs"
		});
	}
})
//list
app.get('/users', (req, res) => {
	if (!!req.body.name) {
		var name = req.body.name
		new Promise(function(resolve, reject) {
			//fetch datas with respect to the given name
			mysqlConnection.query(`select * from users where name REGEXP '[${name}]'`, function(err, data_user) {
				if (err) {
					console.log(err);
					return;
				}
				resolve(data_user)
			})
		}).then((data_user) => {
			res.status(200).json({
				success: 'true',
				users: data_user
			})
		})
	} else {
		//if input field are missing
		res.status(200).json({
			status: 0,
			msg: "Insufficient inputs"
		});
	}
})
//update
app.put('/:id/user', (req, res) => {
	if (!!req.params.id && !!req.body.name && !!req.body.email && !!req.body.phone_number) {
		var _id = req.params.id;
		var email = req.body.email;
		var name = req.body.name;
		var phone_number = req.body.phone_number;
		new Promise(function(resolve, reject) {
			//update users with respect to inputs
			mysqlConnection.query(`update users set name = '${name}',email = '${email}',phone_number = '${phone_number}' where id = ${_id}`, function(err, complete_status) {
				if (err) {
					console.log(err);
					return;
				}
				resolve(complete_status)
			})
		}).then(() => {
			//fetch the updated data
			mysqlConnection.query(`select * from users where id = ${_id}`, function(err, data) {
				if (err) {
					console.log(err);
					return;
				} else {
					if (data.length == 0) {
						res.status(200).json({
							status: "Id is not exist!!"
						})
					} else {
						res.status(200).json({
							update_user: data[0]
						})
					}
				}
			})
		})
	} else {
		//if input field are missing
		res.status(200).json({
			status: 0,
			msg: "Insufficient inputs"
		});
	}
})
app.listen(process.env.port, () => {
	console.log("Started on PORT");
})