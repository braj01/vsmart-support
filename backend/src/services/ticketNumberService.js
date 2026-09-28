const { Ticket } = require('../models');
const { Op } = require('sequelize');

async function generateTicketNumber(transaction) {
  const last = await Ticket.findOne({
    where: { ticket_number: { [Op.regexp]: '^[0-9]{4}$' } },
    order: [['ticket_number', 'DESC']],
    lock: transaction.LOCK.UPDATE,
    transaction,
  });

  let seq = 1;
  if (last) seq = parseInt(last.ticket_number) + 1;
  return String(seq).padStart(4, '0');
}

module.exports = { generateTicketNumber };
