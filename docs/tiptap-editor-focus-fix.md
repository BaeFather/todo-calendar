# Tiptap 에디터 클릭 포커스 버그 수정

## 문제 현상

할일 입력폼(`todo-form.tsx`)의 내용 입력란(Tiptap 에디터)에서, 텍스트가 있는 정확한 위치가 아니라 입력란 "근처"(패딩 여백 부분)를 클릭하면 포커스가 잡히지 않아 입력을 시작하기 어려운 문제가 있었다.

## 원인

`src/components/editor/tiptap-editor.tsx`는 아래와 같은 구조로 되어 있었다.

```tsx
<div className={cn("rounded-md border border-input", ...)}>
  {editable && editor && <TiptapToolbar editor={editor} />}
  <EditorContent
    editor={editor}
    className={cn("min-h-32 px-3 py-2 text-sm focus:outline-none", !editable && "px-0 py-0", PROSE_CLASSNAME)}
  />
</div>
```

Tiptap React의 `EditorContent`는 자신에게 전달된 `className`을 **바깥 wrapper div**에만 적용하고, 실제 `contenteditable`인 내부 `.ProseMirror` 엘리먼트에는 상속하지 않는다. 그 결과:

- `min-h-32`로 확보한 최소 높이 영역
- `px-3 py-2`로 생긴 좌우/상하 패딩 영역

은 시각적으로는 입력란처럼 보이지만 실제로는 `.ProseMirror` 엘리먼트 바깥이라, 그 부분을 클릭해도 에디터가 포커스를 받지 못했다. 특히 한 줄짜리 짧은 텍스트만 있는 상태에서는 이 "가짜 여백"이 넓게 남아 체감 버그가 두드러졌다.

## 수정 내용

Tiptap 공식 권장 방식대로, 입력 가능 영역 자체의 스타일(패딩/최소높이/타이포그래피 등)은 `useEditor`의 `editorProps.attributes.class`로 지정해 실제 `.ProseMirror` 엘리먼트에 직접 적용되도록 변경했다.

- `min-h-32 px-3 py-2 text-sm focus:outline-none`, `!editable && "px-0 py-0"`, `PROSE_CLASSNAME`을 `EditorContent`의 `className`에서 `editorProps.attributes.class`로 이동.
- `<EditorContent editor={editor} />`에는 더 이상 별도 className을 주지 않음.
- 바깥 `<div>` wrapper는 테두리/포커스 링 스타일(`rounded-md border border-input`, `focus-within:ring-3 focus-within:ring-ring/50`)만 계속 담당.

이제 시각적으로 보이는 입력란 전체가 실제 `contenteditable` 영역과 정확히 일치하므로, 어느 지점을 클릭하든 바로 포커스가 잡힌다.

## 변경 파일

- `src/components/editor/tiptap-editor.tsx`
