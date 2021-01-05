// inspired by https://gist.github.com/jshawl/6225945
// Thanks @jshawl!

// now using grunt-sass to avoid Ruby dependency

module.exports = function( grunt ) {
	const sass = require( 'node-sass' );
	let slug = grunt.option( 'slug' ) || 'squarecandy-acf-newplugin';
	slug = slug.toLowerCase().replace( /[_ ]/g, '-' );
	const name = grunt.option( 'name' ) || 'Square Candy ACF New Plugin';
	const description = grunt.option( 'description' ) || 'A new plugin that does something custom.';
	grunt.initConfig( {
		pkg: grunt.file.readJSON( 'package.json' ),
		sass: {
			// sass tasks
			dist: {
				files: {
					'dist/css/main.min.css': 'css/main.scss', // this is our main scss file
				},
			},
			options: {
				implementation: sass,
				compass: true,
				style: 'expanded',
				sourceMap: true,
			},
		},
		postcss: {
			options: {
				map: true, // inline sourcemaps
				processors: [
					require( 'pixrem' )(), // add fallbacks for rem units
					require( 'autoprefixer' )( { grid: 'autoreplace' } ), // add vendor prefixes
					require( 'cssnano' )(), // minify the result
				],
			},
			dist: {
				src: 'dist/css/*.css',
			},
		},
		terser: {
			options: {
				sourceMap: true,
			},
			dist: {
				files: [
					{
						expand: true,
						src: '*.js',
						dest: 'dist/js',
						cwd: 'js',
						ext: '.min.js',
					},
				],
			},
		},
		phpcs: {
			application: {
				src: [ '*.php', 'inc/*.php', 'template-parts/*.php' ],
			},
			options: {
				bin: './vendor/squizlabs/php_codesniffer/bin/phpcs',
				standard: 'phpcs.xml',
			},
		},
		stylelint: {
			src: [ 'css/*.scss', 'css/**/*.scss', 'css/*.css' ],
		},
		eslint: {
			gruntfile: {
				src: [ 'Gruntfile.js' ],
			},
			src: {
				src: [ 'js/*.js' ],
			},
		},
		run: {
			stylelintfix: {
				cmd: 'npx',
				args: [ 'stylelint', 'css/*.scss', '--fix' ],
			},
			eslintfix: {
				cmd: 'eslint',
				args: [ 'js/*.js', '--fix' ],
			},
			replacereadme: {
				cmd: 'mv',
				args: [ '-f', 'README.prod.md', 'README.md' ],
			},
			replacegrunt: {
				cmd: 'mv',
				args: [ '-f', 'Gruntfile.prod.js', 'Gruntfile.js' ],
			},
		},
		watch: {
			css: {
				files: [ 'css/*.scss' ],
				tasks: [ 'run:stylelintfix', 'sass', 'postcss' ],
			},
			js: {
				files: [ 'js/*.js' ],
				tasks: [ 'run:eslintfix', 'terser' ],
			},
		},
		'string-replace': {
			main: {
				files: {
					'style.css': 'style.css',
					'README.md': 'README.md',
					'README.prod.md': 'README.prod.md',
					'readme.txt': 'readme.txt',
					'functions.php': 'functions.php',
				},
				options: {
					replacements: [
						{
							pattern: /squarecandy-plugin-starter/g,
							replacement: slug,
						},
						{
							pattern: /squarecandy_plugin_starter/g,
							replacement: slug.replace( /-/g, '_' ),
						},
						{
							pattern: /SQUARECANDY_STARTER/g,
							replacement: slug.toUpperCase().replace( /-/g, '_' ),
						},
						{
							pattern: 'Square Candy Plugin Starter',
							replacement: name,
						},
						{
							pattern: 'A WordPress plugin template to get you started with common features and file structure.',
							replacement: description,
						},
						{
							pattern: /Version: (.*)/g,
							replacement: 'Version: 0.0.1',
						},
						{
							pattern: /Stable tag: (.*)/g,
							replacement: 'Stable tag: 0.0.1',
						},
						{
							pattern: /version-.[^']*/gim,
							replacement: 'version-0.0.1',
						},
					],
					saveUnchanged: false,
				},
			},
			package: {
				files: {
					'package.json': 'package.json',
					'package-lock.json': 'package-lock.json',
					'composer.json': 'composer.json',
					'composer.lock': 'composer.lock',
				},
				options: {
					replacements: [
						{
							pattern: /squarecandy-plugin-starter/g,
							replacement: slug,
						},
						{
							pattern: 'Square Candy Plugin Starter',
							replacement: name,
						},
						{
							pattern: 'A WordPress plugin template to get you started with common features and file structure.',
							replacement: description,
						},
						{
							pattern: /\n	"version": "(.*)"/g,
							replacement: '\n	"version": "0.0.1"',
						},
					],
					saveUnchanged: false,
				},
			},
			changelog: {
				files: {
					'CHANGELOG.md': 'CHANGELOG.md',
				},
				options: {
					replacements: [
						{
							pattern: /[\S\s]/g,
							replacement: '',
						},
					],
					saveUnchanged: false,
				},
			},
		},
	} );

	grunt.loadNpmTasks( 'grunt-sass' );
	grunt.loadNpmTasks( 'grunt-contrib-watch' );
	grunt.loadNpmTasks( 'grunt-terser' );
	grunt.loadNpmTasks( 'grunt-phpcs' );
	grunt.loadNpmTasks( 'grunt-stylelint' );
	grunt.loadNpmTasks( 'grunt-eslint' );
	grunt.loadNpmTasks( 'grunt-postcss' );
	grunt.loadNpmTasks( 'grunt-run' );
	grunt.loadNpmTasks( 'grunt-string-replace' );
	grunt.registerTask( 'init', [ 'string-replace', 'sass', 'postcss', 'terser', 'run:replacereadme', 'run:replacegrunt' ] );
	grunt.registerTask( 'default', [ 'sass', 'postcss', 'terser', 'watch' ] );
	grunt.registerTask( 'preflight', [ 'sass', 'postcss', 'terser', 'phpcs', 'stylelint', 'eslint' ] );
};
