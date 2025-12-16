const { sequelize } = require('../models');

/**
 * Chuyển đổi Polygon từ VN2000 (EPSG:9210) sang WGS84 (EPSG:4326) sử dụng PostGIS
 * @param {Object} geometry - Geometry type Polygon
 * @param {string} fromSrid - SRID nguồn (mặc định: EPSG:9210 - VN2000/105°45')
 * @param {string} toSrid - SRID đích (mặc định: EPSG:4326 - WGS84)
 * @returns {Object} Geometry đã chuyển đổi
 */
const transformPolygon = async (geometry, fromSrid = 3405, toSrid = 4326) => {
    if (!geometry || geometry.type !== 'Polygon') return geometry;
    try {
        const query = `
            SELECT ST_AsGeoJSON(
                ST_Transform(
                    ST_SetSRID(ST_GeomFromGeoJSON(?), ?),
                    ?
                )
            ) AS transformed_geometry
        `;
        const replacements = [JSON.stringify(geometry), fromSrid, toSrid];
        const [results] = await sequelize.query(query, {
            replacements,
            type: sequelize.QueryTypes.SELECT
        });
        if (results?.transformed_geometry) {
            return JSON.parse(results.transformed_geometry);
        }
        return geometry;
    } catch (error) {
        console.error('Lỗi chuyển đổi Polygon:', error);
        return geometry;
    }
};

/**
 * Chuyển đổi Point hoặc các geometry khác (trừ Polygon) từ VN2000 (EPSG:9209) sang WGS84 (EPSG:4326)
 * @param {Object} geometry - Geometry object
 * @param {string} fromSrid - SRID nguồn (mặc định: EPSG:9209 - VN2000/104°45')
 * @param {string} toSrid - SRID đích (mặc định: EPSG:4326 - WGS84)
 * @returns {Object} Geometry đã chuyển đổi
 */
const transformGeometry = async (geometry, fromSrid, toSrid) => {
    if (!geometry) return null;
    try {
        let query = '';
        let replacements = [];
        if (geometry.type === 'Point') {
            const [x, y] = geometry.coordinates;
            query = `
                SELECT ST_AsGeoJSON(
                    ST_Transform(
                        ST_SetSRID(ST_MakePoint(?, ?), ?),
                        ?
                    )
                ) AS transformed_geometry
            `;
            replacements = [x, y, fromSrid, toSrid];
        } else {
            query = `
                SELECT ST_AsGeoJSON(
                    ST_Transform(
                        ST_SetSRID(ST_GeomFromGeoJSON(?), ?),
                        ?
                    )
                ) AS transformed_geometry
            `;
            replacements = [JSON.stringify(geometry), fromSrid, toSrid];
        }
        const [results] = await sequelize.query(query, {
            replacements,
            type: sequelize.QueryTypes.SELECT
        });
        if (results?.transformed_geometry) {
            return JSON.parse(results.transformed_geometry);
        }
        return geometry;
    } catch (error) {
        console.error('Lỗi chuyển đổi tọa độ:', error);
        return geometry;
    }
};


const transformGeometryList = async (dataList, fromSrid, toSrid) => {
    if (!Array.isArray(dataList)) return dataList;

    const result = await Promise.all(dataList.map(async (item) => {
        const transformedItem = item.toJSON ? item.toJSON() : item;

        if (transformedItem.geometry) {
            transformedItem.geometry = await transformGeometry(transformedItem.geometry, fromSrid, toSrid);
        }

        return transformedItem;
    }));

    return result;
};

const transformPolygonList = async (dataList) => {
    if (!Array.isArray(dataList)) return dataList;
    return Promise.all(dataList.map(async item => {
        const transformedItem = item.toJSON ? item.toJSON() : item;
        if (transformedItem.geometry && transformedItem.geometry.type === 'Polygon') {
            transformedItem.geometry = await transformPolygon(transformedItem.geometry);
        }
        return transformedItem;
    }));
};



module.exports = {
    transformGeometry,
    transformPolygon,
    transformGeometryList,
    transformPolygonList,

}; 