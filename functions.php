<?php
// main plugin file

define( 'SQUARECANDY_STARTER_DIR_PATH', plugin_dir_path( __FILE__ ) );
define( 'SQUARECANDY_STARTER_URL', plugin_dir_url( __FILE__ ) );

// don't let users activate w/o ACF
register_activation_hook( __FILE__, 'squarecandy_plugin_starter_activate' );
function squarecandy_plugin_starter_activate() {
	if ( ! function_exists( 'acf_add_options_page' ) || ! function_exists( 'get_field' ) ) {
		// check that ACF functions we need are available. Complain and bail out if they are not
		wp_die(
			'The Square Candy Plugin Starter Plugin requires ACF Pro
			(<a href="https://www.advancedcustomfields.com">Advanced Custom Fields</a>).
			<br><br><button onclick="window.history.back()">&laquo; back</button>'
		);
	}

	// set the default settings for any options fields here...

	// we need to flush permalinks when the plugin is activated
	update_option( 'squarecandy_acf_plugin_starter_needs_permalink_refresh', '1' );
}

// flush rewrite rules when the options page saves
function squarecandy_acf_plugin_starter_options_save() {
	$screen = get_current_screen();
	if ( strpos( $screen->id, 'acf-options-plugin-starter-options' ) !== false ) {
		update_option( 'squarecandy_acf_plugin_starter_needs_permalink_refresh', '1' );
	}
}
add_action( 'acf/save_post', 'squarecandy_acf_plugin_starter_options_save', 20 );


add_action( 'admin_init', 'squarecandy_acf_plugin_starter_flush_rewrite' );
function squarecandy_acf_plugin_starter_flush_rewrite() {
	if ( get_option( 'squarecandy_acf_plugin_starter_needs_permalink_refresh' ) ) {
		flush_rewrite_rules();
		update_option( 'squarecandy_acf_plugin_starter_needs_permalink_refresh', false );
	}
}


// add ACF fields
require_once SQUARECANDY_STARTER_DIR_PATH . 'inc/acf.php';

// Front End Scripts and Styles
function squarecandy_plugin_starter_enqueue_scripts() {
	wp_enqueue_style( 'squarecandy-plugin-starter-css', SQUARECANDY_STARTER_URL . 'dist/css/main.min.css', false, 'version-1.0.6' );
	wp_enqueue_script( 'squarecandy-plugin-starter-js', SQUARECANDY_STARTER_URL . 'dist/js/main.min.js', array( 'jquery' ), 'version-1.0.6', true );
}
add_action( 'wp_enqueue_scripts', 'squarecandy_plugin_starter_enqueue_scripts' );
