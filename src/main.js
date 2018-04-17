const fs = require('fs');
const _ = require('lodash');
let pickCount = 0;
const jsxFiles = ls({ ext: 'jsx', dir: 'D:\\workspace\\admin-copy\\admin-react-ui\\src\\' });
const allComponentsRegex = new RegExp(_.reduce(jsxFiles, reduceAllComponentsRegex, ''), 'g');
let site = convertToTree(jsxFiles.map(extractMatchResult), 'Site');
travel(site, (node) => {
    ['childrenComponents', 'path', 'fileName', 'fullPath'].forEach(name => delete node[name]);
});
console.log(JSON.stringify(site));

function travel(node, callback) {
    callback(node);
    if (node.children)
        node.children.forEach((c) => travel(c, callback));
}

function extractMatchResult(item) {
    const content = fs.readFileSync(item.fullPath, 'utf-8');
    const matched = content.match(allComponentsRegex);
    item.childrenComponents = getChildrenComponents({ matched });
    return item;
}

function convertToTree(array, name) {
    if (name) {
        const target = array.find(a => a.name === name);
        return pickChildren(target, cloneUniq(array));
    }
    return array.map(item => pickChildren(item, cloneUniq(array)));
}
function cloneUniq(array) {
    return array.map(a => {
        const t = _.cloneDeep(a);
        t.uu = new Date().getTime() + Math.random(10000000);
        return t;
    });
}

function pickChildren(node, array, path = []) {
    if (path.find(p => p === node.name)) {
        console.log(`loop detected!${node.name}`);
        const last = _.last(path);
        console.log(`loop path!${JSON.stringify(last)}`);
        return node;
    }
    path.push(node.name);
    node.path = path.length ? path.join('/') : node.name;
    pickCount++;
    const newArray = cloneUniq(array);
    if (node.childrenComponents.length > 0) {
        node.children = function () {
            const t = array
                .filter(s => {
                    return node.childrenComponents.indexOf(s.name) > -1;
                });
            t.forEach(c => {
                if (node.name === c.name) {
                    console.log('found duplicate:' + c.name);
                    c.childrenComponents = [];
                    c.children = [];
                }
                const newPath = _.cloneDeep(path);
                pickChildren(c, newArray, newPath);
            });
            console.log(`${node.name} has children [${t.map(t => t.name).join(',')}]`)
            return t;
        }();
    } else {
        console.log(`${node.name} doesn't have children`);
    }
    return node;
}

function reduceAllComponentsRegex(result, item) {
    return `${result}${result ? '|' : ''}<${item.name}\\s`;
}

function getChildrenComponents({ matched }) {
    return _.reduce(matched, (result, matchedItem) => {
        const tag = matchedItem.replace(/<|\s/g, '');
        if (result.find(r => r === tag))
            return result;

        result.push(tag);
        return result;
    }, []);
}

function ls({ ext, dir }) {
    const files = fs.readdirSync(dir);
    return _.reduce(files, (result, value) => {
        const fullPath = `${dir}/${value}`;
        if (isTargetFile({ fullPath, ext }))
            return result.concat([createItem(fullPath)]);
        if (isDir({ fullPath }))
            return result.concat(ls({ ext, dir: `${dir}/${value}` }));

        return result;
    }, []);
}

function createItem(fullPath) {
    const fileName = fullPath.split('/').reverse()[0];
    const name = fileName.split('.')[0];
    return {
        name,
        fileName,
        fullPath
    };
}

function isDir({ fullPath }) {
    return fs.statSync(fullPath).isDirectory();
}

function isTargetFile({ fullPath, ext }) {
    return fullPath.endsWith(`.${ext}`);
}
