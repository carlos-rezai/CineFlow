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
    <p className="text-section mood-section-label">Select Mood</p>
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
    <p className="text-section mood-section-label">
      Anything else on your mind?
    </p>
    <textarea
      className="mood-freetext"
      data-testid="mood-freetext"
      placeholder="Type anything..."
      value={freeText}
      onChange={(e) => onFreeTextChange(e.target.value)}
    />
    <button
      className="mood-submit-btn"
      data-testid="mood-submit"
      disabled={!canSubmit || disabled}
      onClick={onSubmit}
    >
      <span>Find My Pick</span>
      <span>→</span>
    </button>
  </div>
)

export default MoodInput
