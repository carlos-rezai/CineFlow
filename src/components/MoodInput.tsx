interface MoodInputProps {
  tags: readonly string[]
  selectedTags: string[]
  onToggleTag: (tag: string) => void
  freeText: string
  onFreeTextChange: (value: string) => void
  onSubmit: () => void
  canSubmit: boolean
  disabled: boolean
}

const MoodInput = ({
  tags,
  selectedTags,
  onToggleTag,
  freeText,
  onFreeTextChange,
  onSubmit,
  canSubmit,
  disabled,
}: MoodInputProps) => (
  <div className="mood-idle">
    <div className="mood-tags">
      {tags.map((tag) => (
        <button
          key={tag}
          className={`mood-tag-chip${selectedTags.includes(tag) ? ' mood-tag-chip--selected' : ''}`}
          data-testid="mood-tag"
          aria-pressed={selectedTags.includes(tag)}
          onClick={() => onToggleTag(tag)}
        >
          {tag}
        </button>
      ))}
    </div>
    <input
      className="mood-freetext"
      data-testid="mood-freetext"
      placeholder="Anything else on your mind?"
      value={freeText}
      onChange={(e) => onFreeTextChange(e.target.value)}
    />
    <button
      className="mood-submit-btn"
      data-testid="mood-submit"
      disabled={!canSubmit || disabled}
      onClick={onSubmit}
    >
      Find my pick
    </button>
  </div>
)

export default MoodInput
