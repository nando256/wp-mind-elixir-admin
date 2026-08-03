=== Mind Elixir Admin Mind Maps ===
Contributors: nando256
Donate link: https://github.com/bomura/wp-mind-elixir-admin
Tags: mind map, mindelixir, admin, editor, mind mapping, mindmap
Tested up to: 6.8
Stable tag: 1.3.0
License: MIT
License URI: https://opensource.org/licenses/MIT

== Description ==
Adds an admin page for creating/editing mind maps using Mind Elixir.

This plugin provides a custom admin interface where administrators can visualize and modify mind map data directly within the WordPress dashboard. The data is stored in the database in the wp_options 'mind_elixir_map_data'.

== Installation ==
1. Upload the entire plugin folder to '/wp-content/plugins/wp-mind-elixir-admin'.
2. Activate "Mind Elixir Admin Mind Maps" through the "Plugins" menu in WordPress.
3. Access the editor from the "Mind Map Editor" menu on the left sidebar.

== Screenshots ==
1. Mind Map Editor Page – Mind map editor displayed in the WordPress admin panel

== Notes ==
Feel free to use it for your notes.

== Third-Party Libraries ==
* Mind Elixir – JavaScript-based open-source mind map core library.
  Official Site: https://mind-elixir.com/
  GitHub: https://github.com/SSShooter/mind-elixir-core
  License: MIT License
  Features: Lightweight, high performance, framework-independent, supports drag and drop, export to SVG/PNG/HTML, and more.

== Frequently Asked Questions ==
= How do I reset the mind map? =
「Click the "Reset Mind Map" button to reset the editor content to the initial state.

= Where is data stored? =
WordPress options table under the key 'mind_elixir_map_data'.

== Changelog ==
= 1.0 =
* Initial release.
* Added admin menu.
* Loaded Mind Elixir via CDN.
* Implemented mind map save and reset features.

= 1.3.0 =
* Updated Mind Elixir library to 5.15.0.
* Added full WordPress posts and categories mind map import feature via REST API.
* Added GitHub Actions release workflow for packaging zip archives.

== Upgrade Notice ==
= 1.0 =
No special upgrade procedures required for the initial release.
= 1.1 =
Changed to be able to manage multiple mind maps
= 1.2 =
Added auto-save function every 5 minutes
= 1.3 =
Added image (png, svg) saving function
= 1.3.0 =
Added full posts & categories import feature and updated Mind Elixir library to 5.15.0.

== License ==
This plugin is released under the MIT License.
