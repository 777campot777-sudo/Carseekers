const axios = require('axios');
const csv = require('csv-parser');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.SUPABASE_URL, 
    process.env.SUPABASE_KEY
);

const COPART_CSV_URL = 'СЮДА_ВСТАВЬ_ССЫЛКУ_НА_CSV_ОТ_COPART';

async function run() {
    console.log('Загрузка CSV-файла с Copart...');

    try {
        const response = await axios({
            method: 'get',
            url: COPART_CSV_URL,
            responseType: 'stream'
        });

        const rows = [];

        response.data
            .pipe(csv())
            .on('data', (row) => {
                rows.push({
                    lot_number: parseInt(row['Lot Number'] || 0),
                    vin: row['VIN'] || 'UNKNOWN',
                    year: parseInt(row['Year'] || 0),
                    make: row['Make'] || '',
                    model: row['Model'] || '',
                    document_type: row['Document Type'] || '',
                    is_active: true
                });

                if (rows.length >= 500) {
                    uploadBatch([...rows]);
                    rows.length = 0;
                }
            })
            .on('end', async () => {
                if (rows.length > 0) {
                    await uploadBatch(rows);
                }
                console.log('Обновление базы успешно завершено!');
            });

    } catch (error) {
        console.error('Ошибка загрузки:', error.message);
    }
}

async function uploadBatch(batchData) {
    const { error } = await supabase
        .from('copart_lots')
        .upsert(batchData, { onConflict: 'lot_number' });

    if (error) {
        console.error('Ошибка записи в базу Supabase:', error.message);
    }
}

run();
