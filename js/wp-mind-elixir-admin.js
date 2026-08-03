jQuery(document).ready(function($){
    // Compatible MindElixir constructor resolution (supports both Mind Elixir v4 & v5)
    const ME = (typeof MindElixir !== 'undefined' && MindElixir.default) ? MindElixir.default : MindElixir;

    let mind;
    mind = new ME({ el: '#map' });
    mind.init(ME.new('New Mind Map'));

    var intervalMs = 5 * 60 * 1000;
    // 定期実行を開始
    var timerId = setInterval(function() {
        // チェックボックスがチェックされているか判定
        var isChecked = $('#mea_autosave_enabled').prop('checked');
        if (isChecked) {
            // ボタンのクリックイベントを発火
            $('#save-map-button').trigger('click');
        }
    }, intervalMs);

    // 一覧取得＆プルダウン生成
    function refreshMapList(name = ''){
        $.post(MEAMapData.ajax_url, {
            action: 'mea_list_maps',
            nonce:  MEAMapData.nonce
        }, function(resp){
            if (!resp.success) return;
            const $sel = $('#mea-map-selector').empty();
            resp.data.forEach(item => {
                $sel.append(
                    $('<option>')
                        .val(item.name)
                        .text(item.topic)
                );
            });
            // name が空文字のときは先頭オプションを選択
            const toSelect = name || $sel.find('option:first').val();
            $sel.val(toSelect).change();
        });
    }

    // 初期ロード
    refreshMapList();

    // プルダウンが変わったら即ロード
    $('#mea-map-selector').on('change', function(){
        const selected = $(this).val();
        if (selected) {
            const name = $('#mea-map-selector').val();
            $.post(MEAMapData.ajax_url, {
                action: 'mea_load_mind_map',
                map_name: name,
                nonce: MEAMapData.nonce
            })
            .done(function(response){
                if (response.success) {
                    if(typeof response.data == 'undefined' || !response.data) {
                        mind.init(ME.new('New Mind Map'));
                    } else {
                        mind.init(response.data);
                    }
                    $('#save-status').text('Mind map loaded successfully!').css('color', 'green');
                } else {
                    $('#save-status').text('Error loading mind map.').css('color', 'red');
                }
            })
            .fail(function(){
                $('#save-status').text('AJAX error.').css('color', 'red');
            });
        }
    });

    // Save button handler: send data via AJAX to PHP.
    $('#save-map-button').on('click', function(){
        var name = $('#mea-map-selector').val();
        if(name === null || name === ''){
            const today = new Date().toISOString().replaceAll(/[-T:Z\.]/g,'');
            name = 'mind_elixir_map_data_' + today;
        }
        const data = mind.getData();  // Get current map data object.
        const dataString = JSON.stringify(data);
        $.post(MEAMapData.ajax_url, {
            action: 'mea_save_mind_map',
            name: name,
            data: dataString,
            nonce: MEAMapData.nonce
        })
        .done(function(response){
            if (response.success) {
                $('#save-status').text('Mind map saved successfully!').css('color', 'green');
                refreshMapList(name);
            } else {
                $('#save-status').text('Error saving mind map.').css('color', 'red');
            }
        })
        .fail(function(){
            $('#save-status').text('AJAX error.').css('color', 'red');
        });
    });

    async function downloadImage(type) {
        let blob;
        try{
            if (type === 'png') {
                blob = await mind.exportPng(true, '');
            } else {
                blob = mind.exportSvg(true, '');
            }
        } catch (err) {
            console.error('エクスポート失敗:', err);
            return;
        }
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `mindmap.${type}`;
        a.click();
        URL.revokeObjectURL(url);
    }

    $('#mea-export-png').on('click', function(){
        downloadImage('png');
    });
    $('#mea-export-svg').on('click', function(){
        downloadImage('svg');
    });

    // New button handler: create a new root node and refresh the map.
    $('#new-map-button').on('click', function(){
        const newData = ME.new('New Mind Map');
        mind.refresh(newData);  // Replace with a new mind map.
        const today = new Date().toISOString().replaceAll(/[-T:Z\.]/g,'');
        var name = 'mind_elixir_map_data_' + today;

        $('#mea-map-selector').append(
            $('<option selected>')
                .val(name)
                .text('New Mind Map' + ' (' + today + ')')
        );

        $('#save-status').text('');
    });

    // Delete button handler: Delete a map and refresh the map.
    $('#delete-map-button').on('click', function(){
        const data = mind.getData();
        const topic = data.nodeData.topic;

        const ok = window.confirm('本当にマインドマップ「'+ topic +'」を削除してもよろしいですか？');
        if (!ok) {
            return;
        }
        const name = $('#mea-map-selector').val();
        $.post(MEAMapData.ajax_url, {
            action: 'mea_delete_mind_map',
            name: name,
            nonce: MEAMapData.nonce
        })
        .done(function(response){
            if (response.success) {
                $('#save-status').text('Mind map deleted successfully!').css('color', 'green');
                refreshMapList('');
            } else {
                $('#save-status').text('Error deleting mind map.').css('color', 'red');
            }
        })
        .fail(function(){
            $('#save-status').text('AJAX error.').css('color', 'red');
        });
    });

    // --- WordPress Posts & Categories Import Feature ---

    // Helper to decode HTML entities (e.g. &amp; -> &)
    function decodeHtmlEntities(text) {
        if (!text) return '';
        const textarea = document.createElement('textarea');
        textarea.innerHTML = text;
        return textarea.value;
    }

    // Helper to fetch paginated REST API resources
    async function fetchAllRestResources(endpoint) {
        let results = [];
        let page = 1;
        let totalPages = 1;

        do {
            const separator = endpoint.includes('?') ? '&' : '?';
            const url = `${endpoint}${separator}page=${page}&per_page=100`;
            const response = await fetch(url, {
                headers: {
                    'X-WP-Nonce': MEAMapData.rest_nonce
                }
            });

            if (!response.ok) {
                console.warn(`REST API request failed for ${url}: ${response.statusText}`);
                break;
            }

            const pageData = await response.json();
            if (Array.isArray(pageData)) {
                results = results.concat(pageData);
            } else {
                break;
            }

            const totalPagesHeader = response.headers.get('X-WP-TotalPages');
            totalPages = totalPagesHeader ? parseInt(totalPagesHeader, 10) : 1;
            page++;
        } while (page <= totalPages);

        return results;
    }

    // Import All WP Posts & Categories
    async function importWpPostsToMindMap() {
        $('#save-status').text('WordPressのデータ（カテゴリ・タグ・投稿）を取得中...').css('color', '#007cba');

        try {
            // Fetch categories, tags, posts in parallel
            const [categories, tags, posts] = await Promise.all([
                fetchAllRestResources(MEAMapData.rest_url + 'categories'),
                fetchAllRestResources(MEAMapData.rest_url + 'tags'),
                fetchAllRestResources(MEAMapData.rest_url + 'posts?status=publish,draft,future,pending,private')
            ]);

            $('#save-status').text(`取得完了 (${categories.length} カテゴリ, ${posts.length} 記事)。ツリー構造を構築中...`).css('color', '#007cba');

            // Tag lookup dictionary
            const tagMap = {};
            tags.forEach(tag => {
                tagMap[tag.id] = tag.name;
            });

            // Map categories by ID
            const categoryNodeMap = {};
            const rootChildren = [];

            // Initialize node for each category
            categories.forEach(cat => {
                categoryNodeMap[cat.id] = {
                    id: 'cat_' + cat.id,
                    topic: decodeHtmlEntities(cat.name),
                    parent_id: cat.parent,
                    children: []
                };
            });

            // Connect category parent/child relationships
            categories.forEach(cat => {
                const node = categoryNodeMap[cat.id];
                if (cat.parent && categoryNodeMap[cat.parent]) {
                    categoryNodeMap[cat.parent].children.push(node);
                } else {
                    rootChildren.push(node);
                }
            });

            // Uncategorized node if needed
            let uncategorizedNode = null;

            // Map status labels
            const statusLabels = {
                publish: '公開済み',
                draft: '下書き',
                future: '予約投稿',
                pending: 'レビュー待ち',
                private: '非公開'
            };

            // Process each post and create node structure
            posts.forEach(post => {
                const postTitle = decodeHtmlEntities(post.title?.rendered || '(無題)');
                const postTags = (post.tags || []).map(id => tagMap[id]).filter(Boolean);

                const postNode = {
                    id: 'post_' + post.id,
                    topic: postTitle,
                    expanded: false, // Collapsed by default for performance & readability
                    data: { wp_post_id: post.id },
                    children: [
                        { id: 'slug_' + post.id, topic: 'スラッグ: ' + post.slug },
                        { id: 'status_' + post.id, topic: '状態: ' + (statusLabels[post.status] || post.status) },
                        { id: 'date_' + post.id, topic: '公開日: ' + (post.date || '未設定') },
                        { id: 'modified_' + post.id, topic: '更新日: ' + (post.modified || '未設定') }
                    ]
                };

                if (postTags.length > 0) {
                    postNode.children.push({
                        id: 'tags_' + post.id,
                        topic: 'タグ: ' + postTags.join(', ')
                    });
                }

                // Attach post to category nodes
                if (post.categories && post.categories.length > 0) {
                    post.categories.forEach(catId => {
                        if (categoryNodeMap[catId]) {
                            categoryNodeMap[catId].children.push(postNode);
                        }
                    });
                } else {
                    if (!uncategorizedNode) {
                        uncategorizedNode = {
                            id: 'cat_uncategorized',
                            topic: '未分類',
                            children: []
                        };
                        rootChildren.push(uncategorizedNode);
                    }
                    uncategorizedNode.children.push(postNode);
                }
            });

            const siteTitle = MEAMapData.site_name ? `${MEAMapData.site_name} サイトマップ` : 'WordPress サイトマップ';

            // Construct Mind Elixir data object
            const importedMapData = {
                nodeData: {
                    id: 'root_wp_sitemap',
                    topic: siteTitle,
                    children: rootChildren
                }
            };

            // Load into Mind Elixir
            mind.init(importedMapData);

            // Generate option name and save
            const today = new Date().toISOString().replaceAll(/[-T:Z\.]/g, '');
            const optionName = 'mind_elixir_map_data_import_' + today;

            // Trigger save automatically
            $.post(MEAMapData.ajax_url, {
                action: 'mea_save_mind_map',
                name: optionName,
                data: JSON.stringify(importedMapData),
                nonce: MEAMapData.nonce
            })
            .done(function(response) {
                if (response.success) {
                    $('#save-status').text(`WordPress全記事のインポートが完了しました！（全${posts.length}記事）`).css('color', 'green');
                    refreshMapList(optionName);
                } else {
                    $('#save-status').text('インポートマップの保存中にエラーが発生しました。').css('color', 'red');
                }
            })
            .fail(function() {
                $('#save-status').text('保存リクエスト中にAJAXエラーが発生しました。').css('color', 'red');
            });

        } catch (err) {
            console.error('Import error:', err);
            $('#save-status').text('WordPress データの取得中にエラーが発生しました: ' + err.message).css('color', 'red');
        }
    }

    // Attach click listener for import button
    $('#mea-import-wp-posts').on('click', function() {
        if (window.confirm('WordPressの全カテゴリおよび全記事をインポートして新しいマインドマップを生成しますか？')) {
            importWpPostsToMindMap();
        }
    });
});
