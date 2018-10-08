# mixedup-ticketing

## Introduction
This is a web platform for ticketing, written especially for the [Mixed Up! concert](https://www.facebook.com/mixedupconcert/) event:

Essentially it can keep track of tickets by email, and will generate and email a unique confirmation code to each ticket input into the system. The administrator account (“NIST”) can also view all the tickets currently available and allocate tickets to each user account (school).

Note: Replace all 'REDACTED' with credentials to use this program.

## Key details
Written in Express, Node.js. Refer to package.json for all packages used.
EJS as the template engine
SQLite database backend
PassportJS as authentication middleware
Nodemailer as the mail agent

## Future plans
- Detach the login for contactmixedup@gmail.com into a mail_credentials.json file or something and add it to .gitignore. Also add the credentials as a setting.
- Write some tests.
- Extend this ticketing system so it can be used for other systems.
