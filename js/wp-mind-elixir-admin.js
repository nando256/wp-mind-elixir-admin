jQuery(document).ready(function($){
    let mind;
    mind = new MindElixir({ el: '#map' });
    mind.init(MindElixir.new('New Mind Map'));

    var intervalMs = 5 * 60 * 1000;
    // 定期実行を開始
    var timerId = setInterval(function() {
        // チェックボックスがチェックされているか判定
        var isChecked = $('#mea_autosave_enabled').prop('checked');
        console.log(isChecked);
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
                    if(typeof response.data == 'undefined') {
                        mind.init(MindElixir.new('New Mind Map'));
                    }else{
                        mind.init(response.data);
                    }
                    $('#save-status').text('Mind map loaded successfully!');
                } else {
                    $('#save-status').text('Error loading mind map.');
                }
            })
            .fail(function(){
                $('#save-status').text('AJAX error.');
            });
        }
    });

    // Save button handler: send data via AJAX to PHP.
    $('#save-map-button').on('click', function(){
        var name = $('#mea-map-selector').val();
        if(name === null){
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
                $('#save-status').text('Mind map saved successfully!');
                refreshMapList(name);
            } else {
                $('#save-status').text('Error saving mind map.');
            }
        })
        .fail(function(){
            $('#save-status').text('AJAX error.');
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
    })
    $('#mea-export-svg').on('click', function(){
        downloadImage('svg');
    })

    // New button handler: create a new root node and refresh the map.
    $('#new-map-button').on('click', function(){
        const newData = MindElixir.new('New Mind Map');
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
        // mind.getData() でオブジェクトが得られているなら…
        const data = mind.getData();
        const topic = data.nodeData.topic;

        // 確認ダイアログを出す
           const ok = window.confirm('本当にマインドマップ「'+ topic +'」を削除してもよろしいですか？');
        if (!ok) {
            // キャンセルされたら何もしない
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
                $('#save-status').text('Mind map deleted successfully!');
                refreshMapList(name);
            } else {
                $('#save-status').text('Error deleting mind map.');
            }
        })
        .fail(function(){
            $('#save-status').text('AJAX error.');
        });
    });
});
