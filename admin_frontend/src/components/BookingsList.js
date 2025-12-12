const BookingsList = ({ bookings, onDeleteBooking }) => {
  return (
    <div>
      <h3>All Bookings</h3>
      {bookings.length === 0 ? (
        <p>No bookings yet</p>
      ) : (
        <ul>
          {bookings.map((booking, idx) => (
            <li key={idx}>
              Room {booking.room.number} - {booking.room.type} - ${booking.room.price} -
              Booked by {booking.guestName}

              {/* Delete and Unbook buttons */}
              <button 
                style={{ marginLeft: "10px" }}
                onClick={() => onDeleteBooking(booking._id)}
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default BookingsList;