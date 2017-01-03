import React from 'react';

import Link from './Link';


export default class RoomSelector extends React.Component {
  render() {
    return (
      <div className='room-selector'>
        <div className='header'>
          Your IP address is <em>{this.props.ipAddress}</em>. This give you access to the following rooms:
        </div>
        <table>
          <thead>
            <tr>
              <th>Room</th>
              <th>Messages</th>
              <th>Online</th>
              <th>Description</th>
            </tr>
          </thead>
          <tbody>
            {
              this.props.rooms.map((room) => (
                <tr>
                  <td>{room.name}</td>
                  <td>{room.messages}</td>
                  <td>{room.online}</td>
                  <td>{room.description}</td>
                  <td><Link className='join-button'>join</Link></td>
                </tr>
              ))
            }
          </tbody>
        </table>
      </div>
    );
  }
}

RoomSelector.propTypes = {
  rooms:  React.PropTypes.array.isRequired,
  ipAddress: React.PropTypes.string.isRequired
}
