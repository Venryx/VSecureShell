// Copyright 2017 The Chromium OS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

'use strict';

/**
 * @fileoverview Code for dealing with the specific message types used in
 * the SSH agent protocol.
 */

nassh.agent.messages = {};

/**
 * Types of requests/responses exchanged between client application and SSH
 * agent. All types are represented as 8-bit unsigned integers.
 * @see https://tools.ietf.org/id/draft-miller-ssh-agent-00.html#rfc.section.5.1
 *
 * @readonly
 * @enum {!number}
 */
nassh.agent.messages.Numbers = {
  AGENT_FAILURE: 5,
  AGENT_SUCCESS: 6,
  AGENTC_REQUEST_IDENTITIES: 11,
  AGENT_IDENTITIES_ANSWER: 12,
  AGENTC_SIGN_REQUEST: 13,
  AGENT_SIGN_RESPONSE: 14,
};

/**
 * Generic agent responses.
 * @see https://tools.ietf.org/id/draft-miller-ssh-agent-00.html#rfc.section.4.1
 *
 * @readonly
 * @const {!nassh.agent.Message}
 */
nassh.agent.messages.SUCCESS =
    new nassh.agent.Message(nassh.agent.messages.Numbers.AGENT_SUCCESS);
nassh.agent.messages.FAILURE =
    new nassh.agent.Message(nassh.agent.messages.Numbers.AGENT_FAILURE);

/**
 * Map message types to reader function.
 *
 * @type {Object<!nassh.agent.messages.Numbers, function(!nassh.agent.Message):
 *     void>}
 * @private
 */
nassh.agent.messages.readers_ = {};

/**
 * Read the contents of a message into fields according to the format specified
 * by its type.
 *
 * @param {nassh.agent.Message} message
 */
nassh.agent.messages.read = function(message) {
  if (nassh.agent.messages.readers_.hasOwnProperty(message.type)) {
    try {
      return nassh.agent.messages.readers_[message.type](message);
    } catch (e) {
      console.error(e);
      return null;
    }
  } else {
    console.warn(`messages.read: message number ${message.type} not supported`);
    return null;
  }
};

/**
 * Read an AGENTC_REQUEST_IDENTITIES request.
 * @see https://tools.ietf.org/id/draft-miller-ssh-agent-00.html#rfc.section.4.4
 *
 * @param {!nassh.agent.Message} message A message of type
 *     AGENTC_REQUEST_IDENTITIES.
 */
nassh.agent.messages
    .readers_[nassh.agent.messages.Numbers.AGENTC_REQUEST_IDENTITIES] =
    function(message) {
  if (!message.eom()) {
    throw new Error(
        'AGENTC_REQUEST_IDENTITIES: message body longer than expected');
  }
  return message;
};

/**
 * Read an AGENTC_SIGN_REQUEST request.
 * @see https://tools.ietf.org/id/draft-miller-ssh-agent-00.html#rfc.section.4.5
 *
 * @param {!nassh.agent.Message} message A message of type AGENTC_SIGN_REQUEST.
 */
nassh.agent.messages
    .readers_[nassh.agent.messages.Numbers.AGENTC_SIGN_REQUEST] = function(
    message) {
  message.fields.keyBlob = message.readString();
  message.fields.data = message.readString();
  message.fields.flags = message.readUint32();
  if (!message.eom()) {
    throw new Error('AGENTC_SIGN_REQUEST: message body longer than expected');
  }
  return message;
};

/**
 * Map message types to writer function.
 *
 * @type {Object<!nassh.agent.messages.Numbers, function(...[*]):
 *     !nassh.agent.Message>}
 * @private
 */
nassh.agent.messages.writers_ = {};

/**
 * Write a message of a given type.
 *
 * @param {!nassh.agent.messages.Numbers} type
 * @param {...*} args Any number of arguments dictated by the type.
 * @returns {!nassh.agent.Message} A message of the given type encoding the
 *     supplied arguments.
 */
nassh.agent.messages.write = function(type, ...args) {
  if (nassh.agent.messages.writers_.hasOwnProperty(type)) {
    try {
      return nassh.agent.messages.writers_[type](...args);
    } catch (e) {
      console.error(e);
      return nassh.agent.messages.FAILURE;
    }
  } else {
    console.warn(`messages.write: message number ${type} not supported`);
    return nassh.agent.messages.FAILURE;
  }
};

/**
 * An SSH identity (public key), containing the wire encoding of the public key
 * and a UTF-8 encoded human-readable comment.
 * @see https://tools.ietf.org/id/draft-miller-ssh-agent-00.html#rfc.section.4.4
 *
 * @typedef {{keyBlob: !Uint8Array, comment: !Uint8Array}} Identity
 */

/**
 * Write an AGENT_IDENTITIES_ANSWER response.
 * @see https://tools.ietf.org/id/draft-miller-ssh-agent-00.html#rfc.section.4.4
 *
 * @param {!Array<!Identity>} identities An array of SSH identities.
 * @returns {!nassh.agent.Message}
 */
nassh.agent.messages
    .writers_[nassh.agent.messages.Numbers.AGENT_IDENTITIES_ANSWER] = function(
    identities) {
  const message = new nassh.agent.Message(
      nassh.agent.messages.Numbers.AGENT_IDENTITIES_ANSWER);
  message.writeUint32(identities.length);
  for (const identity of identities) {
    message.writeString(identity.keyBlob);
    message.writeString(identity.comment);
  }
  return message;
};

/**
 * Write an AGENT_SIGN_RESPONSE response.
 * @see https://tools.ietf.org/id/draft-miller-ssh-agent-00.html#rfc.section.4.5
 *
 * @param {!Uint8Array} signature The computed signature.
 * @returns {!nassh.agent.Message}
 */
nassh.agent.messages
    .writers_[nassh.agent.messages.Numbers.AGENT_SIGN_RESPONSE] = function(
    signature) {
  const message =
      new nassh.agent.Message(nassh.agent.messages.Numbers.AGENT_SIGN_RESPONSE);
  message.writeString(signature);
  return message;
};
