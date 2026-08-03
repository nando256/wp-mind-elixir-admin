<?php
/**
 * Plugin Name: 	Mind Elixir Admin Mind Maps
 * Plugin URI: 		https://blog.donguri3.net
 * Description: 	Adds an admin page for creating/editing mind maps using Mind Elixir.
 * Version: 		1.3.0
 * Requires at least:	6.8
 * Requires PHP:	8.3
 * Author:		nando256
 * Author URI:		https://blog.donguri3.net
 * License:		MIT License
 * Text Domain:		wp-mind-elixir-editor
 */

// Exit if accessed directly.
if ( ! defined( 'ABSPATH' ) ) {
        exit;
}
global $wpdb;

// Add admin menu page (only for administrators.
function mea_add_admin_menu() {
        add_menu_page(
                'Mind Map Editor',            // Page title
                'Mind Map Editor',            // Menu title
                'manage_options',             // Capability (admin only)
                'wp-mind-elixir-editor',      // Menu slug
                'mea_render_admin_page',      // Callback to render the page
                'dashicons-chart-pie',        // Icon (example)
                80                            // Position
        );
}
add_action( 'admin_menu', 'mea_add_admin_menu' );

// 一覧取得
function mea_list_maps() {
        check_ajax_referer('mea_map_nonce','nonce');
        global $wpdb;
        // LIKE パターン生成
        $pattern = $wpdb->esc_like('mind_elixir_map_data_') . '%';

        $rows = $wpdb->get_results(
                $wpdb->prepare(
                        "SELECT option_name, option_value
                        FROM {$wpdb->options}
                        WHERE option_name LIKE %s
                        ORDER BY option_id DESC",
                        $pattern
                ),
                ARRAY_A
        );

        $list = [];
        foreach ($rows as $row) {
                $data = json_decode($row['option_value'], true);
                if (isset($data['nodeData']['topic'])) {
                        $list[] = [
                                'name'  => $row['option_name'],
                                'topic' => $data['nodeData']['topic'],
                        ];
                }
        }
        // topic 列だけを取り出す
        $topics = array_column($list, 'topic');

        // topic 列と元の配列を一緒にソート（昇順）
        array_multisort($topics, SORT_DESC, SORT_STRING, $list);

	    wp_send_json_success($list);
}
add_action('wp_ajax_mea_list_maps', 'mea_list_maps');

// Enqueue scripts/styles for our admin page.
function mea_admin_enqueue_scripts( $hook_suffix ) {
        // Only load on our plugin's admin page.
        if ( $hook_suffix !== 'toplevel_page_wp-mind-elixir-editor' ) {
                return;
        }
        // Mind Elixir library from CDN.
        wp_enqueue_script(
                'wp-mind-elixir-cdn',
                'https://cdn.jsdelivr.net/npm/mind-elixir@5.15.0/dist/MindElixir.iife.js',
                array(),
                '5.15.0',
                true
        );
        // Our custom JS (depends on jQuery and Mind Elixir).
        wp_enqueue_script(
                'wp-mind-elixir-admin-js',
                plugin_dir_url(__FILE__) . 'js/wp-mind-elixir-admin.js',
                array( 'jquery', 'wp-mind-elixir-cdn' ),
                '1.0',
                true
        );


        // Localize script with saved data and AJAX info.
        wp_localize_script( 'wp-mind-elixir-admin-js', 'MEAMapData', array(
                'ajax_url'   => admin_url( 'admin-ajax.php' ),
                'nonce'      => wp_create_nonce( 'mea_map_nonce' ),
                'rest_url'   => esc_url_raw( rest_url( 'wp/v2/' ) ),
                'rest_nonce' => wp_create_nonce( 'wp_rest' ),
                'site_name'  => get_bloginfo( 'name' ),
        ) );

        // Basic CSS for the map container.
        wp_enqueue_style(
                'wp-mind-elixir-admin-css',
                plugin_dir_url(__FILE__) . 'css/wp-mind-elixir-admin.css',
                array(),
                '1.0'
        );
}
add_action( 'admin_enqueue_scripts', 'mea_admin_enqueue_scripts' );

// Render the admin page content.
function mea_render_admin_page() {
        if ( ! current_user_can( 'manage_options' ) ) {
                return;
        }
?>
    <div class="wrap">
        <h1>Mind Map Editor</h1>
        <div id="map"></div>
        <p class="mea-toolbar">
            <select id="mea-map-selector"></select>
            <button id="save-map-button" class="button button-primary">Save Mind Map</button>
            <button id="mea-import-wp-posts" class="button button-secondary">⚡ 全記事インポート</button>
            <button id="mea-export-svg" class="button">SVG ダウンロード</button>
            <button id="mea-export-png" class="button">PNG ダウンロード</button>
            <button id="new-map-button" class="button">New Mind Map</button>
            <button id="delete-map-button" class="button">Delete Mind Map</button>
            <label><input type="checkbox" id="mea_autosave_enabled" name="mea_autosave_enabled" checked />自動保存を有効にする</label>
        </p>
        <div id="save-status"></div>
    </div>
<?php
}

// AJAX: Load map data
function mea_load_mind_map() {
        // JS 側で wp_create_nonce('mea_map_nonce') したアクション名と同じに
        check_ajax_referer('mea_map_nonce', 'nonce');  // ← フィールド名も 'nonce' と一致させる :contentReference[oaicite:1]{index=1}

        // JS から送られてくるキー名に合わせる
        $option_name = isset($_POST['map_name'])
                ? sanitize_text_field($_POST['map_name'])
                : '';

        if ( ! $option_name ) {
                wp_send_json_error('マップ名が空です');
        }

        // 実際のオプションを取得
        $mapdata = get_option( $option_name, '' );

        // JSON をデコードして配列で返すか、文字列のまま返すかはお好みで
        $decoded = json_decode( $mapdata, true );

        wp_send_json_success( $decoded );
}
add_action('wp_ajax_mea_load_mind_map', 'mea_load_mind_map');

// Handle AJAX save (wp_ajax only for logged-in users).
function mea_save_mind_map() {
        // Capability check.
        if ( ! current_user_can( 'manage_options' ) ) {
                wp_send_json_error( 'Permission denied' );
        }
        // Nonce verification.
        check_ajax_referer( 'mea_map_nonce', 'nonce' );
        // Retrieve posted data.
        $data = isset($_POST['data']) ? wp_unslash( $_POST['data'] ) : '';
        $option_name = isset($_POST['name']) ? wp_unslash( $_POST['name'] ) : 'mind_elixir_map_data_' . current_time('YmdHis');

        if ( $data ) {
                update_option( $option_name, $data );
                wp_send_json_success( 'Map saved' );
        } else {
                wp_send_json_error( 'No data to save' );
        }
}
add_action( 'wp_ajax_mea_save_mind_map', 'mea_save_mind_map' );

// Handle AJAX save (wp_ajax only for logged-in users).
function mea_delete_mind_map() {
        // Capability check.
        if ( ! current_user_can( 'manage_options' ) ) {
                wp_send_json_error( 'Permission denied' );
        }
        // Nonce verification.
        check_ajax_referer( 'mea_map_nonce', 'nonce' );
        // Retrieve posted data.
        $option_name = isset($_POST['name']) ? wp_unslash( $_POST['name'] ) : '';

        if( isset($option_name) && $option_name !== '') {
                $result = delete_option($option_name);
                if ( $result ) {
                        wp_send_json_success( 'Map deleted' );
                } else {
                        wp_send_json_error( 'No data to delete' );
                }
        }
}
add_action( 'wp_ajax_mea_delete_mind_map', 'mea_delete_mind_map' );
