# floorplan-editor

## Installation
Clone repo and place it in any web server, and write the url `http://localhost/capture-prototype/`.

A simple configuration in apache would be (file `default.conf`). Remember to replace `path_to_project` by the path were you cloned this project:

```bash
  <VirtualHost *:80>
      ServerAdmin webmaster@localhost
      DocumentRoot /path_to_project/capture-prototype/
      <Directory /path_to_project/capture-prototype/>
          Options Indexes FollowSymLinks
          AllowOverride None
          Require all granted
      </Directory>
      ErrorLog ${APACHE_LOG_DIR}/error.log
  </VirtualHost>
````

## Features


### JSON Export
System can save current floorplan's state. It will create a "floorplan.json" file, and allow user to download it.
Actually json contains the next keys:
```
{
    corners: [],
    walls: [],
    doors: [],
    windows: [],
    cameras: [],
    embeds: [], //Embedded objects, like bedrooms, tables, etc
    placements: {} //room properties
}
````
Each key-value pair is an enumeration of appropriate objects.

## Tests
Consist of mocha.js framework unit tests. Please, don't forget dependencies, written in package.json. Run command
````bash
npm install
````
into root project directory. Check engines also, because mocha requirements is '"node": ">= 0.10.x", "npm": ">= 1.4.x"'.

####test/
Consist of unit tests of autonomous methods. Tested applications is 
three-application.js and three-merging.js that attempts to build 3d models of rooms 
in capture-prototype project. It's node.js based tests. 
Please, run `npm test` in root folder after installation the dependencies.

####test-manual/index.html
Consist of browser's tests. Capture-prototype application working process 
tested fully in this file. Please, run it in your browser after 
installation dependencies.

##