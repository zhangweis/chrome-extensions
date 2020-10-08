(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.tableify = f()}})(function(){var define,module,exports;return (function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
"use strict";

module.exports = init({

});

module.exports.defaults = init;

function init(config) {
    var classes = config.classes === false ? false : true;
    var classPrefix = config.classPrefix || "";

    return function tableify(obj, columns, parents) {
        var buf = [];
        var type = typeof obj;
        var cols;

        parents = parents || [];

        if (type !== 'object' || obj == null || obj == undefined) {
        }
        else if (~parents.indexOf(obj)) {
            return "[Circular]";
        }
        else {
            parents.push(obj);
        }

        if (Array.isArray(obj)) {
            if (Array.isArray(obj[0]) && obj.every(Array.isArray)) {
                buf.push('<table>','<tbody>');
                cols = [];
                
                // 2D array is an array of rows
                obj.forEach(function (row, ix) {
                    cols.push(ix);

                    buf.push('<tr>');
                    
                    row.forEach(function (val) {
                        buf.push('<td' + getClass(val) + '>', tableify(val, cols, parents), '</td>')
                    });
                    
                    buf.push('</tr>');
                });
                
                buf.push('</tbody>','</table>');
            }
            else if (typeof obj[0] === 'object') {
                buf.push('<table>','<thead>','<tr>');

                //loop through every object and get unique keys
                var keys = {};
                obj.forEach(function (o) {
                    if (typeof o === 'object' && !Array.isArray(o)) {
                        Object.keys(o).forEach(function (k) {
                            keys[k] = true;
                        });
                    }
                });

                cols = Object.keys(keys);

                cols.forEach(function (key) {
                    buf.push('<th' + getClass(obj[0][key]) + '>', key, '</th>');
                });

                buf.push('</tr>', '</thead>', '<tbody>');

                obj.forEach(function (record) {
                    buf.push('<tr>');
                    buf.push(tableify(record, cols, parents));
                    buf.push('</tr>');
                });

                buf.push('</tbody></table>');
            }
            else {
                buf.push('<table>','<tbody>');
                cols = [];

                obj.forEach(function (val, ix) {
                    cols.push(ix);
                    buf.push('<tr>', '<td' + getClass(val) + '>', tableify(val, cols, parents), '</td>', '</tr>');
                });

                buf.push('</tbody>','</table>');
            }

        }
        else if (obj && typeof obj === 'object' && !Array.isArray(obj) && !(obj instanceof Date)) {
            if (!columns) {
                buf.push('<table>');

                Object.keys(obj).forEach(function (key) {
                    buf.push('<tr>', '<th' + getClass(obj[key]) + '>', key, '</th>', '<td' + getClass(obj[key]) + '>', tableify(obj[key], false, parents), '</td>', '</tr>');
                });

                buf.push('</table>');
            }
            else {
                columns.forEach(function (key) {
                    if (typeof obj[key] === 'object' && !Array.isArray(obj[key])) {
                        buf.push('<td' + getClass(obj[key]) + '>', tableify(obj[key], false, parents), '</td>');
                    }
                    else {
                        buf.push('<td' + getClass(obj[key]) + '>', tableify(obj[key], columns, parents), '</td>');
                    }
                });
            }
        }
        else {
            buf.push(obj);
        }

        if (type !== 'object' || obj == null || obj == undefined) {
        }
        else {
            parents.pop(obj);
        }

        return buf.join('');
    }

    function getClass(obj) {
        if (!classes) {
            return '';
        }

        return ' class="'
            + classPrefix
            + ((obj && obj.constructor && obj.constructor.name)
                ? obj.constructor.name
                : typeof obj || ''
            ).toLowerCase()
            + ((obj === null)
                ? ' null'
                : ''
            )
            + '"'
            ;
    }

}
},{}]},{},[1])(1)
});
