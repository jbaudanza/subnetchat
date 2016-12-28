import React from 'react'
import Rx from 'rxjs';

import {bindAll} from 'lodash';

import ObservablesClient from 'rxremote/observables_client';
import bindComponentToObservables from './bindComponentToObservables';
import bindComponentToInterval from './bindComponentToInterval';
import distanceOfTimeInWords from './distanceOfTimeInWords'


const observablesClient = new ObservablesClient();

function fmtTimestamp(timestamp) {
  return new Date(timestamp).toDateString()
}

class ChatRoomStatsTable extends React.Component {
  render() {
    return (
      <table>
        <thead>
          <tr>
            <th>Channel name</th>
            <th>Created at</th>
            <th>Last message</th>
            <th>Last messageAt</th>
            <th>Message count</th>
            <th>Online count</th>
          </tr>
        </thead>
        <tbody>
        {
          this.props.channelStats.map((stats, i) => (
            <tr key={i}>
              <td>{stats.name}</td>
              <td>{fmtTimestamp(stats.createdAt)}</td>
              <td>{stats.lastMessage}</td>
              <td>{distanceOfTimeInWords(this.props.now - new Date(stats.lastMessageAt))}</td>
              <td>{stats.messageCount}</td>
              <td>{stats.onlineCount}</td>
            </tr>
          ))
        }
        </tbody>
      </table>
    );
  }
}


class SessionStatsTable extends React.Component {
  render() {
    return (
      <table>
        <thead>
          <tr>
            <th>IP Address</th>
            <th>Session ID</th>
            <th>Connected at</th>
          </tr>
        </thead>
        <tbody>
        {
          this.props.sessionStats.map((stats, i) => (
            <tr key={i}>
              <td>{stats.ipAddress}</td>
              <td>{stats.sessionId}</td>
              <td>{fmtTimestamp(stats.timestamp)}</td>
            </tr>
          ))
        }
        </tbody>
      </table>
    );
  }
}


export default class AdminApp extends React.Component {
  componentWillMount() {
    this.ChatRoomStatsTable = bindComponentToObservables(
        ChatRoomStatsTable, {channelStats: observablesClient.observable('channel-stats').startWith([])}
    );

    this.SessionStatsTable = bindComponentToObservables(
        SessionStatsTable, {sessionStats: observablesClient.observable('session-stats').startWith([])}
    )

    this.Root = bindComponentToInterval((props) => (
      <div>
        <this.ChatRoomStatsTable {...props} />
        <this.SessionStatsTable {...props} />
      </div>
    ), 60000);
  }

  render() {
    return <this.Root />;
  }
}
