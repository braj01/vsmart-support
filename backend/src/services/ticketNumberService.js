const { Ticket } = require('../models');
const { Op } = require('sequelize');
const sequelize = require('../config/database');

async function generateTicketNumber() {
  return await sequelize.transaction(async (t) => {
    const last = await Ticket.findOne({
      where: { ticket_number: { [Op.like]: '____' } },
      order: [['ticket_number', 'DESC']],
      lock: t.LOCK.UPDATE,
      transaction: t,
    });

    let seq = 1;
    if (last) {
      const parts = last.ticket_number.split('-');
      seq = parseInt(parts[parts.length - 1]) + 1;
    }
    return String(seq).padStart(4, '0');
  });
}

module.exports = { generateTicketNumber };
