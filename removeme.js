// frontend/src/components/__tests__/RoomList.test.js
import { render, screen } from '@testing-library/react';
import RoomList from '../RoomList';

test('renders room list', () => {
  render(<RoomList rooms={[{ number: 101, type: 'Single', price: 100 }]} />);
  expect(screen.getByText(/Single/)).toBeInTheDocument();
});