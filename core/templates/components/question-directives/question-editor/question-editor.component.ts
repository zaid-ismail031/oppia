// Copyright 2018 The Oppia Authors. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS-IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/**
 * @fileoverview Component for the questions editor tab.
 */

import { Component, ChangeDetectorRef, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { downgradeComponent } from '@angular/upgrade/static';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import cloneDeep from 'lodash/cloneDeep';
import { Subscription } from 'rxjs';
import { MarkAllAudioAndTranslationsAsNeedingUpdateModalComponent } from 'components/forms/forms-templates/mark-all-audio-and-translations-as-needing-update-modal.component';
import { StateEditorService } from 'components/state-editor/state-editor-properties-services/state-editor.service';
import { StateInteractionIdService } from 'components/state-editor/state-editor-properties-services/state-interaction-id.service';
import { MisconceptionSkillMap } from 'domain/skill/MisconceptionObjectFactory';
import { Outcome } from 'domain/exploration/OutcomeObjectFactory';
import { Question } from 'domain/question/QuestionObjectFactory';
import { QuestionUpdateService } from 'domain/question/question-update.service';
import { Solution } from 'domain/exploration/SolutionObjectFactory';
import { Hint } from 'domain/exploration/HintObjectFactory';
import { AnswerGroup } from 'domain/exploration/AnswerGroupObjectFactory';
import { State } from 'domain/state/StateObjectFactory';
import { SubtitledHtml } from 'domain/exploration/subtitled-html.model';
import { UrlInterpolationService } from 'domain/utilities/url-interpolation.service';
import { SolutionValidityService } from 'pages/exploration-editor-page/editor-tab/services/solution-validity.service';
import { EditabilityService } from 'services/editability.service';
import { InteractionCustomizationArgs } from 'interactions/customization-args-defs';
import { LoaderService } from 'services/loader.service';

@Component({
  selector: 'oppia-question-editor',
  templateUrl: './question-editor.component.html'
})
export class QuestionEditorComponent implements OnInit, OnDestroy {
  @Input() userCanEditQuestion: boolean;
  @Input() misconceptionsBySkill: MisconceptionSkillMap;
  @Input() question: Question;
  @Input() questionId: string;
  @Input() questionStateData: State;
  @Output() questionChange = new EventEmitter<void>();

  componentSubscriptions = new Subscription();
  interactionIsShown: boolean;
  oppiaBlackImgUrl: string;
  stateEditorIsInitialized: boolean;

  constructor(
    private changeDetectionRef: ChangeDetectorRef,
    private editabilityService: EditabilityService,
    private loaderService: LoaderService,
    private ngbModal: NgbModal,
    private questionUpdateService: QuestionUpdateService,
    private solutionValidityService: SolutionValidityService,
    private stateEditorService: StateEditorService,
    private stateInteractionIdService: StateInteractionIdService,
    private urlInterpolationService: UrlInterpolationService,
  ) { }

  showMarkAllAudioAsNeedingUpdateModalIfRequired(contentIds: string[]): void {
    const state = this.question.getStateData();
    const recordedVoiceovers = state.recordedVoiceovers;
    const writtenTranslations = state.writtenTranslations;

    const shouldPrompt = contentIds.some(
      (contentId) =>
        recordedVoiceovers.hasUnflaggedVoiceovers(contentId));
    if (shouldPrompt) {
      this.ngbModal.open(
        MarkAllAudioAndTranslationsAsNeedingUpdateModalComponent, {
          backdrop: 'static'
        }).result.then(() => {
        this._updateQuestion(() => {
          contentIds.forEach(contentId => {
            if (recordedVoiceovers.hasUnflaggedVoiceovers(contentId)) {
              recordedVoiceovers.markAllVoiceoversAsNeedingUpdate(
                contentId);
            }
            if (
              writtenTranslations.hasUnflaggedWrittenTranslations(
                contentId)
            ) {
              writtenTranslations.markAllTranslationsAsNeedingUpdate(
                contentId);
            }
          });
        });
      }, () => {
        // This callback is triggered when the Cancel button is
        // clicked. No further action is needed.
      });
    }
  }

  saveInteractionId(displayedValue: string): void {
    this._updateQuestion(() => {
      this.stateEditorService.setInteractionId(cloneDeep(displayedValue));
    });
  }

  saveInteractionAnswerGroups(newAnswerGroups: AnswerGroup[]): void {
    this._updateQuestion(() => {
      this.stateEditorService.setInteractionAnswerGroups(
        cloneDeep(newAnswerGroups));
    });
  }

  saveInteractionDefaultOutcome(newOutcome: Outcome): void {
    this._updateQuestion(() => {
      this.stateEditorService.setInteractionDefaultOutcome(
        cloneDeep(newOutcome));
    });
  }

  saveInteractionCustomizationArgs(
      displayedValue: InteractionCustomizationArgs): void {
    this._updateQuestion(() => {
      this.stateEditorService.setInteractionCustomizationArgs(
        cloneDeep(displayedValue));
    });
  }

  saveNextContentIdIndex(displayedValue: number): void {
    this._updateQuestion(() => {
      const stateData = this.question.getStateData();
      stateData.nextContentIdIndex = cloneDeep(displayedValue);
    });
  }

  saveSolution(displayedValue: Solution): void {
    this._updateQuestion(() => {
      this.stateEditorService.setInteractionSolution(
        cloneDeep(displayedValue));
    });

    this.changeDetectionRef.detectChanges();
  }

  saveHints(displayedValue: Hint[]): void {
    this._updateQuestion(() => {
      this.stateEditorService.setInteractionHints(
        cloneDeep(displayedValue));
    });
  }

  saveInapplicableSkillMisconceptionIds(
      displayedValue: string[]): void {
    this.stateEditorService.setInapplicableSkillMisconceptionIds(
      cloneDeep(displayedValue));
    this.questionUpdateService.setQuestionInapplicableSkillMisconceptionIds(
      this.question, displayedValue);
  }

  getStateContentPlaceholder(): string {
    return 'Type your question here.';
  }

  getStateContentSaveButtonPlaceholder(): string {
    return 'Save Question';
  }

  _updateQuestion(updateFunction: Function): void {
    this.questionChange.emit();
    this.questionUpdateService.setQuestionStateData(
      this.question, updateFunction);
  }

  saveStateContent(displayedValue: SubtitledHtml): void {
    // Show the interaction when the text content is saved, even if no
    // content is entered.
    this._updateQuestion(() => {
      const stateData = this.question.getStateData();
      stateData.content = cloneDeep(displayedValue);
      this.interactionIsShown = true;
    });
  }

  _init(): void {
    this.stateEditorService.setStateNames([]);
    this.stateEditorService.setCorrectnessFeedbackEnabled(true);
    this.stateEditorService.setInQuestionMode(true);
    if (this.question) {
      this.stateEditorService.setInapplicableSkillMisconceptionIds(
        this.question.getInapplicableSkillMisconceptionIds());
    }
    this.solutionValidityService.init(['question']);
    const stateData = this.questionStateData;
    stateData.interaction.defaultOutcome.setDestination(null);
    if (stateData) {
      this.stateEditorService.onStateEditorInitialized.emit(stateData);

      if (stateData.content.html || stateData.interaction.id) {
        this.interactionIsShown = true;
      }

      this.loaderService.hideLoadingScreen();
    }
    this.stateEditorIsInitialized = true;
  }

  ngOnInit(): void {
    this.componentSubscriptions.add(
      this.stateEditorService.onStateEditorDirectiveInitialized.subscribe(
        () => this._init()
      )
    );
    this.componentSubscriptions.add(
      this.stateEditorService.onInteractionEditorInitialized.subscribe(
        () => this._init()
      )
    );
    this.componentSubscriptions.add(
      this.stateInteractionIdService.onInteractionIdChanged.subscribe(
        () => this._init()
      )
    );

    if (this.userCanEditQuestion) {
      this.editabilityService.markEditable();
    } else {
      this.editabilityService.markNotEditable();
    }
    this.stateEditorService.setActiveStateName('question');
    this.stateEditorService.setMisconceptionsBySkill(
      this.misconceptionsBySkill);
    this.oppiaBlackImgUrl = this.urlInterpolationService.getStaticImageUrl(
      '/avatar/oppia_avatar_100px.svg');

    this.interactionIsShown = false;
    this.stateEditorIsInitialized = false;
    this._init();
  }

  ngOnDestroy(): void {
    this.componentSubscriptions.unsubscribe();
  }
}

angular.module('oppia').directive('oppiaQuestionEditor',
  downgradeComponent({
    component: QuestionEditorComponent
  }) as angular.IDirectiveFactory);
