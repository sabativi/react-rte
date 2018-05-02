/* @flow */
import React, {Component} from 'react';
import {CompositeDecorator, ContentBlock, EditorState, Modifier, RichUtils, Entity} from 'draft-js';
import getDefaultKeyBinding from 'draft-js/lib/getDefaultKeyBinding';
import changeBlockDepth from './lib/changeBlockDepth';
import changeBlockType from './lib/changeBlockType';
import getBlocksInSelection from './lib/getBlocksInSelection';
import insertBlockAfter from './lib/insertBlockAfter';
import isListItem from './lib/isListItem';
import isSoftNewlineEvent from 'draft-js/lib/isSoftNewlineEvent';
import EditorToolbar from './lib/EditorToolbar';
import EditorValue from './lib/EditorValue';
import LinkDecorator from './lib/LinkDecorator';
import ImageDecorator from './lib/ImageDecorator';
import composite from './lib/composite';
import cx from 'classnames';
import autobind from 'class-autobind';
import EventEmitter from 'events';
import {BLOCK_TYPE} from 'draft-js-utils';
import MultiDecorator from 'draft-js-plugins-editor/lib/Editor/MultiDecorator';

import './Draft.global.css';
import styles from './RichTextEditor.css';

import { ImportOptions } from './lib/EditorValue';

import Editor from 'draft-js-plugins-editor';
import createMentionPlugin, { defaultSuggestionsFilter } from 'draft-js-mention-plugin';

const mentions = [
  {
    name: 'Matthew Russell',
    link: 'https://twitter.com/mrussell247',
    avatar: 'https://pbs.twimg.com/profile_images/517863945/mattsailing_400x400.jpg',
  },
  {
    name: 'Julian Krispel-Samsel',
    link: 'https://twitter.com/juliandoesstuff',
    avatar: 'https://avatars2.githubusercontent.com/u/1188186?v=3&s=400',
  },
  {
    name: 'Jyoti Puri',
    link: 'https://twitter.com/jyopur',
    avatar: 'https://avatars0.githubusercontent.com/u/2182307?v=3&s=400',
  },
  {
    name: 'Max Stoiber',
    link: 'https://twitter.com/mxstbr',
    avatar: 'https://pbs.twimg.com/profile_images/763033229993574400/6frGyDyA_400x400.jpg',
  },
  {
    name: 'Nik Graf',
    link: 'https://twitter.com/nikgraf',
    avatar: 'https://avatars0.githubusercontent.com/u/223045?v=3&s=400',
  },
  {
    name: 'Pascal Brandt',
    link: 'https://twitter.com/psbrandt',
    avatar: 'https://pbs.twimg.com/profile_images/688487813025640448/E6O6I011_400x400.png',
  },
];

import ButtonGroup from './ui/ButtonGroup';
import Button from './ui/Button';
import Dropdown from './ui/Dropdown';

const MAX_LIST_DEPTH = 2;

// Custom overrides for "code" style.
const styleMap = {
  CODE: {
    backgroundColor: '#f3f3f3',
    fontFamily: '"Inconsolata", "Menlo", "Consolas", monospace',
    fontSize: 16,
    padding: 2,
  },
};

var decorator = new CompositeDecorator([
  LinkDecorator,
  ImageDecorator,
]);
type ChangeHandler = (value: EditorValue) => any;

type Props = {
  className?: string;
  toolbarClassName?: string;
  editorClassName?: string;
  value: EditorValue;
  onChange?: ChangeHandler;
  placeholder?: string;
  customStyleMap?: {[style: string]: {[key: string]: any}};
  handleReturn?: (event: Object) => boolean;
  customControls?: Array<CustomControl>;
  readOnly?: boolean;
  disabled?: boolean; // Alias of readOnly
  toolbarConfig?: ToolbarConfig;
  blockStyleFn?: (block: ContentBlock) => ?string;
  autoFocus?: boolean;
  keyBindingFn?: (event: Object) => ?string;
  rootStyle?: Object;
  editorStyle?: Object;
  toolbarStyle?: Object;
};

decorator = new MultiDecorator([decorator]);

export default class RichTextEditor extends Component {
  constructor(props) {
    super(props);
    this._keyEmitter = new EventEmitter();
    this.mentionPlugin = createMentionPlugin();
    this.state = {
      editorState: EditorState.createEmpty(),
      suggestions: props.mentions || mentions,
    }
    autobind(this);
  }

  componentDidMount() {
    const { autoFocus } = this.props;

    if (!autoFocus) {
      return;
    }
    setTimeout(() => this._focus());
  }

  onChange(editorState) {
    this.setState({
      editorState,
    });
  }

  onSearchChange({ value }) {
    this.setState({
      suggestions: defaultSuggestionsFilter(value, this.props.mentions),
    });
  }

  onAddMention = (mention) => {
    if(this.props.onAddMention) {
      this.props.onAddMention(mention);
    }
    console.log(`${mention} click`);
  }
  render() {
    let {
      value,
      className,
      toolbarClassName,
      editorClassName,
      placeholder,
      customStyleMap,
      readOnly,
      disabled,
      toolbarConfig,
      blockStyleFn,
      customControls,
      keyBindingFn,
      rootStyle,
      toolbarStyle,
      editorStyle,
      ...otherProps // eslint-disable-line comma-dangle
    } = this.props;
    let editorState = value.getEditorState();
    customStyleMap = customStyleMap ? {...styleMap, ...customStyleMap} : styleMap;

    // If the user changes block type before entering any text, we can either
    // style the placeholder or hide it. Let's just hide it for now.
    let combinedEditorClassName = cx({
      [styles.editor]: true,
      [styles.hidePlaceholder]: this._shouldHidePlaceholder(),
    }, editorClassName);
    if (readOnly == null) {
      readOnly = disabled;
    }
    const { MentionSuggestions } = this.mentionPlugin;
    const plugins = [this.mentionPlugin];
    let editorToolbar;
    if (!readOnly) {
      editorToolbar = (
        <EditorToolbar
          rootStyle={toolbarStyle}
          className={toolbarClassName}
          keyEmitter={this._keyEmitter}
          editorState={editorState}
          onChange={this._onChange}
          focusEditor={this._focus}
          toolbarConfig={toolbarConfig}
          customControls={customControls}
        />
      );
    }
    return (
      <div className={cx(styles.root, className)} style={rootStyle}>
        {editorToolbar}
        <div className={combinedEditorClassName} style={editorStyle}>
          <Editor
            {...otherProps}
            blockStyleFn={composite(defaultBlockStyleFn, blockStyleFn)}
            customStyleMap={customStyleMap}
            plugins={plugins}
            editorState={editorState}
            handleReturn={this._handleReturn}
            keyBindingFn={keyBindingFn || this._customKeyHandler}
            handleKeyCommand={this._handleKeyCommand}
            onTab={this._onTab}
            onChange={this._onChange}
            placeholder={placeholder}
            ref="editor"
            spellCheck={true}
            readOnly={readOnly}
          />
           <MentionSuggestions
            onSearchChange={this.onSearchChange}
            suggestions={this.state.suggestions}
            onAddMention={this.onAddMention}
          />
        </div>
      </div>
    );
  }

  _shouldHidePlaceholder(): boolean {
    let editorState = this.props.value.getEditorState();
    let contentState = editorState.getCurrentContent();
    if (!contentState.hasText()) {
      if (contentState.getBlockMap().first().getType() !== 'unstyled') {
        return true;
      }
    }
    return false;
  }

  _handleReturn(event: Object): boolean {
    let {handleReturn} = this.props;
    if (handleReturn != null && handleReturn(event)) {
      return true;
    }
    if (this._handleReturnSoftNewline(event)) {
      return true;
    }
    if (this._handleReturnEmptyListItem()) {
      return true;
    }
    if (this._handleReturnSpecialBlock()) {
      return true;
    }
    return false;
  }

  // `shift + return` should insert a soft newline.
  _handleReturnSoftNewline(event: Object): boolean {
    let editorState = this.props.value.getEditorState();
    if (isSoftNewlineEvent(event)) {
      let selection = editorState.getSelection();
      if (selection.isCollapsed()) {
        this._onChange(RichUtils.insertSoftNewline(editorState));
      } else {
        let content = editorState.getCurrentContent();
        let newContent = Modifier.removeRange(content, selection, 'forward');
        let newSelection = newContent.getSelectionAfter();
        let block = newContent.getBlockForKey(newSelection.getStartKey());
        newContent = Modifier.insertText(
          newContent,
          newSelection,
          '\n',
          block.getInlineStyleAt(newSelection.getStartOffset()),
          null,
        );
        this._onChange(
          EditorState.push(editorState, newContent, 'insert-fragment')
        );
      }
      return true;
    }
    return false;
  }

  // If the cursor is in an empty list item when return is pressed, then the
  // block type should change to normal (end the list).
  _handleReturnEmptyListItem(): boolean {
    let editorState = this.props.value.getEditorState();
    let selection = editorState.getSelection();
    if (selection.isCollapsed()) {
      let contentState = editorState.getCurrentContent();
      let blockKey = selection.getStartKey();
      let block = contentState.getBlockForKey(blockKey);
      if (isListItem(block) && block.getLength() === 0) {
        let depth = block.getDepth();
        let newState = (depth === 0) ?
          changeBlockType(editorState, blockKey, BLOCK_TYPE.UNSTYLED) :
          changeBlockDepth(editorState, blockKey, depth - 1);
        this._onChange(newState);
        return true;
      }
    }
    return false;
  }

  // If the cursor is at the end of a special block (any block type other than
  // normal or list item) when return is pressed, new block should be normal.
  _handleReturnSpecialBlock(): boolean {
    let editorState = this.props.value.getEditorState();
    let selection = editorState.getSelection();
    if (selection.isCollapsed()) {
      let contentState = editorState.getCurrentContent();
      let blockKey = selection.getStartKey();
      let block = contentState.getBlockForKey(blockKey);
      if (!isListItem(block) && block.getType() !== BLOCK_TYPE.UNSTYLED) {
        // If cursor is at end.
        if (block.getLength() === selection.getStartOffset()) {
          let newEditorState = insertBlockAfter(
            editorState,
            blockKey,
            BLOCK_TYPE.UNSTYLED
          );
          this._onChange(newEditorState);
          return true;
        }
      }
    }
    return false;
  }

  _onTab(event: Object): ?string {
    let editorState = this.props.value.getEditorState();
    let newEditorState = RichUtils.onTab(event, editorState, MAX_LIST_DEPTH);
    if (newEditorState !== editorState) {
      this._onChange(newEditorState);
    }
  }

  _customKeyHandler(event: Object): ?string {
    // Allow toolbar to catch key combinations.
    let eventFlags = {};
    this._keyEmitter.emit('keypress', event, eventFlags);
    if (eventFlags.wasHandled) {
      return null;
    } else {
      return getDefaultKeyBinding(event);
    }
  }

  _handleKeyCommand(command: string): boolean {
    let editorState = this.props.value.getEditorState();
    let newEditorState = RichUtils.handleKeyCommand(editorState, command);
    if (newEditorState) {
      this._onChange(newEditorState);
      return true;
    } else {
      return false;
    }
  }

  _onChange(editorState: EditorState) {
    let {onChange, value} = this.props;
    if (onChange == null) {
      return;
    }
    let newValue = value.setEditorState(editorState);
    let newEditorState = newValue.getEditorState();
    this._handleInlineImageSelection(newEditorState);
    onChange(newValue);
  }

  _handleInlineImageSelection(editorState: EditorState) {
    let selection = editorState.getSelection();
    let blocks = getBlocksInSelection(editorState);

    const selectImage = (block, offset) => {
      const imageKey = block.getEntityAt(offset);
      Entity.mergeData(imageKey, {selected: true});
    };

    let isInMiddleBlock = (index) => index > 0 && index < blocks.size - 1;
    let isWithinStartBlockSelection = (offset, index) => (
      index === 0 && offset > selection.getStartOffset()
    );
    let isWithinEndBlockSelection = (offset, index) => (
      index === blocks.size - 1 && offset < selection.getEndOffset()
    );

    blocks.toIndexedSeq().forEach((block, index) => {
      ImageDecorator.strategy(
        block,
        (offset) => {
          if (isWithinStartBlockSelection(offset, index) ||
              isInMiddleBlock(index) ||
              isWithinEndBlockSelection(offset, index)) {
            selectImage(block, offset);
          }
        });
    });
  }

  _focus() {
    this.refs.editor.focus();
  }
}

function defaultBlockStyleFn(block: ContentBlock): string {
  let result = styles.block;
  switch (block.getType()) {
    case 'unstyled':
      return cx(result, styles.paragraph);
    case 'blockquote':
      return cx(result, styles.blockquote);
    case 'code-block':
      return cx(result, styles.codeBlock);
    default:
      return result;
  }
}


function createEmptyValue(): EditorValue {
  return EditorValue.createEmpty(decorator);
}

function createValueFromString(markup: string, format: string, options?: ImportOptions): EditorValue {
  return EditorValue.createFromString(markup, format, decorator, options);
}

// $FlowIssue - This should probably not be done this way.
Object.assign(RichTextEditor, {
  EditorValue,
  decorator,
  createEmptyValue,
  createValueFromString,
  ButtonGroup,
  Button,
  Dropdown,
});

export {
  EditorValue,
  decorator,
  createEmptyValue,
  createValueFromString,
  ButtonGroup,
  Button,
  Dropdown,
};
