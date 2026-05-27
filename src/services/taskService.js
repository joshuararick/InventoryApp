const db = require('../db');

function reorder(orderedIds) {
  const update = db.prepare('UPDATE tasks SET priority = ? WHERE id = ?');
  const run = db.transaction(ids => {
    ids.forEach((id, index) => update.run(index, id));
  });
  run(orderedIds);
}

module.exports = { reorder };
