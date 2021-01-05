# Square Candy Plugin Starter

A WordPress plugin template to get you started with common features and file structure.

## Status

#### develop
![](https://github.com/squarecandy/squarecandy-plugin-starter/workflows/WordPress%20Standards/badge.svg?branch=develop&event=push)

#### master
![](https://github.com/squarecandy/squarecandy-plugin-starter/workflows/WordPress%20Standards/badge.svg)

## Creating a New Plugin from the Starter

* Login to GitHub and go to the [Square Candy Design organization](https://github.com/squarecandy) page 
* Create a new repository and select Square Candy Plugin Starter as the template. Set it to private and give it a logical name. Our plugins that add new post types and rely on ACF generally follow the naming convention `squarecandy-acf-myspecialplugin`.
* Clone the repository on your local machine within a WordPress testing environment.
* Make sure `npm` and `composer` are installed on your server and up to date.
* Run `npm install` in the plugin directory
* Run `grunt init --slug=my-plugin-slug --name='My Plugin Name' --description='A basic one line description of the plugin'`. The slug should be the exact name of the repo within the squarecandy account. This will get you started replacing the generic template with your new info, but you may still need to clean things up manually. **You should only run this command once**, when you first setup the custom plugin.

## [Developer Guide](https://developers.squarecandy.net)

For more detailed information about coding standards, development philosophy, how to run linting, how to release a new version, and more, visit the [Square Candy Developer Guide](https://developers.squarecandy.net).
