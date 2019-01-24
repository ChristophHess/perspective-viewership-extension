// Copyright 2018 Google LLC
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import { AttributeScores, AttributeScore, EnabledAttributes,
         linscale, getHideCommentReason,
         getHideReasonDescription, getFeedbackQuestion,
         scaleEnabledAttributeScore } from './scores';

function zeroScores(): AttributeScores {
  return {
    'identityAttack': 0.0,
    'insult': 0.0,
    'profanity': 0.0,
    'threat': 0.0,
    'sexuallyExplicit': 0.0,
    'toxicity': 0.0,
    'severeToxicity': 0.0,
    'likelyToReject': 0.0,
  };
}

function allEnabled(): EnabledAttributes {
  return {
    'identityAttack': true,
    'insult': true,
    'profanity': true,
    'threat': true,
    'sexuallyExplicit': true,
  };
}

function allDisabled(): EnabledAttributes {
  return {
    'identityAttack': false,
    'insult': false,
    'profanity': false,
    'threat': false,
    'sexuallyExplicit': false,
  };
}

describe('linscale', () => {
  it('should work', () => {
    expect(linscale(0.0, [0, 1], [2, 4])).toBe(2);
    expect(linscale(0.5, [0, 1], [2, 4])).toBe(3);
    expect(linscale(0.75, [0, 1], [2, 4])).toBe(3.5);
    expect(linscale(1.0, [0, 1], [2, 4])).toBe(4);

    expect(linscale(5, [5, 18], [0, 1])).toBe(0);
    expect(linscale(18, [5, 18], [0, 1])).toBe(1);

    expect(linscale(0.2, [0.0, 1.0], [0, 100])).toBe(20);
    expect(linscale(0.89, [0.0, 1.0], [0, 100])).toBe(89);
  });
});

describe('getHideCommentReason', () => {

  describe('check severe toxicity', () => {
    it('should hide severe toxicity with subtypes enabled', () => {
      const scores = zeroScores();
      scores.severeToxicity = 0.9;
      const reason = getHideCommentReason(
        scores, 0.85, allEnabled(), true /* subtypesEnabled */);
      expect(reason).not.toBe(null);
      expect(reason.attribute).toBe('severeToxicity');
    });

    it('should hide severe toxicity without subtypes enabled', () => {
      const scores = zeroScores();
      scores.severeToxicity = 0.9;
      const reason = getHideCommentReason(
        scores, 0.85, allEnabled(), false /* subtypesEnabled */);
      expect(reason).not.toBe(null);
      expect(reason.attribute).toBe('severeToxicity');
    });

    it('should show low severe toxicity with subtypes enabled', () => {
      const scores = zeroScores();
      scores.severeToxicity = 0.6;
      const reason = getHideCommentReason(
        scores, 0.9, allEnabled(), true /* subtypesEnabled */);
      expect(reason).toBe(null);
    });

    it('should show low severe toxicity without subtypes enabled', () => {
      const scores = zeroScores();
      scores.severeToxicity = 0.6;
      const reason = getHideCommentReason(
        scores, 0.9, allEnabled(), false /* subtypesEnabled */);
      expect(reason).toBe(null);
    });
  });

  describe('check low quality', () => {
    it('should hide low quality with subtypes enabled', () => {
      const scores = zeroScores();
      scores.toxicity = 0.2;
      // Note: we scale down the likelyToReject score because it's sensitive, so
      // it needs to be significantly above the threshold to trigger the
      // filtering logic.
      scores.likelyToReject = 0.5;
      scores.insult = 0.1;
      const reason = getHideCommentReason(
        scores, 0.15, allEnabled(), true /* subtypesEnabled */);
      expect(reason).not.toBe(null);
      // Even though the likelyToReject and toxicity scores are higher, we only
      // return the highest user-facing attribute, which in this case is
      // 'insult'.
      expect(reason.attribute).toBe('insult');
      expect(reason.score).toBe(0.1);
    });

    it('should hide low quality without subtypes enabled', () => {
      const scores = zeroScores();
      scores.toxicity = 0.2;
      // Note: we scale down the likelyToReject score because it's sensitive, so
      // it needs to be significantly above the threshold to trigger the
      // filtering logic.
      scores.likelyToReject = 0.5;
      scores.insult = 0.1;
      const reason = getHideCommentReason(
        scores, 0.15, allEnabled(), false /* subtypesEnabled */);
      expect(reason).not.toBe(null);
      // Even though the likelyToReject and toxicity scores are higher, we only
      // return the highest user-facing attribute, which in this case is
      // 'toxicity'.
      expect(reason.attribute).toBe('toxicity');
      expect(reason.score).toBe(0.2);
    });

    it('should show high quality with subtypes enabled', () => {
      const scores = zeroScores();
      scores.toxicity = 0.2;
      scores.likelyToReject = 0.05;
      scores.insult = 0.1;
      const reason = getHideCommentReason(
        scores, 0.15, allEnabled(), true /* subtypesEnabled */);
      expect(reason).toBe(null);
    });

    it('should show high quality without subtypes enabled', () => {
      const scores = zeroScores();
      scores.toxicity = 0.2;
      scores.likelyToReject = 0.05;
      scores.insult = 0.1;
      const reason = getHideCommentReason(
        scores, 0.15, allEnabled(), false /* subtypesEnabled */);
      expect(reason).toBe(null);
    });

    it('should show low toxicity with subtypes enabled', () => {
      const scores = zeroScores();
      scores.toxicity = 0.03;
      scores.likelyToReject = 0.99;
      const reason = getHideCommentReason(
        scores, 0.15, allEnabled(), true /* subtypesEnabled */);
      expect(reason).toBe(null);
    });

    it('should show low toxicity without subtypes enabled', () => {
      const scores = zeroScores();
      scores.toxicity = 0.03;
      scores.likelyToReject = 0.99;
      const reason = getHideCommentReason(
        scores, 0.15, allEnabled(), false /* subtypesEnabled */);
      expect(reason).toBe(null);
    });
  });

  describe('check enabled attributes', () => {
    it('should hide due to one enabled attribute', () => {
      const scores = zeroScores();
      scores.profanity = 1.0;
      const enabled = allDisabled();
      enabled.profanity = true;
      const reason = getHideCommentReason(
        scores, 0.6, enabled, true /* subtypesEnabled */);
      expect(reason).not.toBe(null);
      expect(reason.attribute).toBe('profanity');
      expect(reason.score).toBe(scaleEnabledAttributeScore(1.0));
    });

    it('should ignore higher score from disabled attribute', () => {
      const scores = zeroScores();
      scores.toxicity = 0.99;
      scores.profanity = 0.95;
      scores.insult = 0.90;
      const enabled = allDisabled();
      enabled.insult = true;
      const reason = getHideCommentReason(
        scores, 0.5, enabled, true /* subtypesEnabled */);
      expect(reason).not.toBe(null);
      expect(reason.attribute).toBe('insult');
      expect(reason.score).toBeCloseTo(scaleEnabledAttributeScore(0.90));
    });

    it('should give highest enabled score', () => {
      const scores = zeroScores();
      scores.profanity = 0.8;
      scores.insult = 0.7;
      const enabled = allDisabled();
      enabled.profanity = true;
      enabled.insult = true;
      const reason = getHideCommentReason(
        scores, 0.5, enabled, true /* subtypesEnabled */);
      expect(reason).not.toBe(null);
      expect(reason.attribute).toBe('profanity');
      expect(reason.score).toBeCloseTo(scaleEnabledAttributeScore(0.8));
    });

    it('should use toxicity score when subtypes are not enabled', () => {
      const scores = zeroScores();
      scores.toxicity = 0.80;
      scores.profanity = 0.95;
      scores.insult = 0.90;
      const enabled = allDisabled();
      enabled.insult = true;
      const reason = getHideCommentReason(
        scores, 0.5, enabled, false /* subtypesEnabled */);
      expect(reason).not.toBe(null);
      expect(reason.attribute).toBe('toxicity');
      expect(reason.score).toBeCloseTo(scaleEnabledAttributeScore(0.80));
    });
  });

});

describe('getHideDescription', () => {
  it('should say "Blaring" for high score values', () => {
    expect(getHideReasonDescription({attribute: 'insult', score: 0.9}))
      .toBe('Blaring');
    expect(getHideReasonDescription({attribute: 'profanity', score: 0.88}))
      .toBe('Blaring');
    expect(getHideReasonDescription({attribute: 'identityAttack', score: 0.87}))
      .toBe('Blaring');
    expect(getHideReasonDescription({attribute: 'severeToxicity', score: 0.90}))
      .toBe('Blaring');
  });

  it('should say "Loud" with medium-high score values', () => {
    expect(getHideReasonDescription({attribute: 'insult', score: 0.80}))
      .toBe('Loud');
    expect(getHideReasonDescription({attribute: 'threat', score: 0.75}))
      .toBe('Loud');
    expect(getHideReasonDescription({attribute: 'sexuallyExplicit', score: 0.70}))
      .toBe('Loud');
  });

  it('should say "Medium" with middle score values', () => {
    expect(getHideReasonDescription({attribute: 'severeToxicity', score: 0.60}))
      .toBe('Medium');
    expect(getHideReasonDescription({attribute: 'insult', score: 0.50}))
      .toBe('Medium');
    expect(getHideReasonDescription({attribute: 'threat', score: 0.45}))
      .toBe('Medium');
    expect(getHideReasonDescription({attribute: 'sexuallyExplicit', score: 0.40}))
      .toBe('Medium');
  });

  it('should say "Low" for medium-low score values', () => {
    expect(getHideReasonDescription({attribute: 'threat', score: 0.35}))
      .toBe('Low');
    expect(getHideReasonDescription({attribute: 'threat', score: 0.20}))
      .toBe('Low');
    expect(getHideReasonDescription({attribute: 'identityAttack', score: 0.18}))
      .toBe('Low');
  });

  it('should say "Quiet" for very low score values', () => {
    expect(getHideReasonDescription({attribute: 'threat', score: 0.10}))
      .toBe('Quiet');
    expect(getHideReasonDescription({attribute: 'identityAttack', score: 0.13}))
      .toBe('Quiet');
    expect(getHideReasonDescription({attribute: null, score: 0.0}))
      .toBe('Quiet');
  });
});

describe('getFeedbackQuestion', () => {
  it('should mention the subtype when we have higher scores with subtypes enabled', () => {
    expect(getFeedbackQuestion(
      {attribute: 'insult', score: 0.9}, true /* subtypesEnabled */))
      .toBe('Is this an insult?');
    expect(getFeedbackQuestion(
      {attribute: 'profanity', score: 0.8}, true /* subtypesEnabled */))
      .toBe('Is this profanity?');
    expect(getFeedbackQuestion(
      {attribute: 'identityAttack', score: 0.75}, true /* subtypesEnabled */))
      .toBe('Is this an attack on identity?');
    expect(getFeedbackQuestion(
      {attribute: 'severeToxicity', score: 0.70}, true /* subtypesEnabled */))
      .toBe('Is this toxic?');
    expect(getFeedbackQuestion(
      {attribute: 'toxicity', score: 0.70}, true /* subtypesEnabled */))
      .toBe('Is this toxic?');
  });

  it('should just ask "should this be hidden" when we have higher scores without subtypes enabled', () => {
    expect(getFeedbackQuestion(
      {attribute: 'severeToxicity', score: 0.9}, false /* subtypesEnabled */))
      .toBe('Should this be hidden?');
    expect(getFeedbackQuestion(
      {attribute: 'insult', score: 0.8}, false /* subtypesEnabled */))
      .toBe('Should this be hidden?');
    expect(getFeedbackQuestion(
      {attribute: 'threat', score: 0.75}, false /* subtypesEnabled */))
      .toBe('Should this be hidden?');
    expect(getFeedbackQuestion(
      {attribute: 'toxicity', score: 0.7}, false /* subtypesEnabled */))
      .toBe('Should this be hidden?');
  });

  it('should just ask "should this be hidden" for middle and low score values', () => {
    expect(getFeedbackQuestion(
      {attribute: 'severeToxicity', score: 0.60}, true /* subtypesEnabled */))
      .toBe('Should this be hidden?');
    expect(getFeedbackQuestion(
      {attribute: 'insult', score: 0.50}, true /* subtypesEnabled */))
      .toBe('Should this be hidden?');
    expect(getFeedbackQuestion(
      {attribute: 'threat', score: 0.10}, true /* subtypesEnabled */))
      .toBe('Should this be hidden?');
    expect(getFeedbackQuestion(
      {attribute: 'sexuallyExplicit', score: 0.05}, true /* subtypesEnabled */))
      .toBe('Should this be hidden?');
    expect(getFeedbackQuestion(
      {attribute: 'toxicity', score: 0.05}, true /* subtypesEnabled */))
      .toBe('Should this be hidden?');
  });
});