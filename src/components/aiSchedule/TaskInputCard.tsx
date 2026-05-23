import { View } from 'react-native';
import { useAIScheduleTaskInput } from './context';
import { DraftTaskRow } from './DraftTaskRow';
import { TaskRow } from './TaskRow';
import { TaskTimePanel } from './TaskTimePanel';
import { useTaskTitleFocus } from '../../hooks/useTaskTitleFocus';

function RowDivider() {
  return <View className="mx-[18px] h-px bg-warm3" />;
}

export function TaskInputCard() {
  const {
    taskRows,
    selectedTaskId,
    onSelectTaskRow,
    onChangeTaskTitle,
    onAddTaskRow,
    onRemoveSelectedTaskRow,
    onConfirmTaskTimeEdit,
  } = useAIScheduleTaskInput();

  const committedRows = taskRows.filter((task) => !task.isDraft);
  const draftTask = taskRows.find((task) => task.isDraft) ?? null;
  const selectedTask = taskRows.find((task) => task.id === selectedTaskId) ?? null;
  const isEditingCommitted = Boolean(selectedTask && !selectedTask.isDraft);
  const showAddTaskRow = !isEditingCommitted;

  const { titleInputRef, confirmWithTitleFocus } = useTaskTitleFocus({
    selectedTaskId,
    selectedTask,
  });

  const renderTimePanel = () => (
    <TaskTimePanel
      onConfirmAdd={() => {
        confirmWithTitleFocus(onConfirmTaskTimeEdit());
      }}
    />
  );

  return (
    <View className="mx-6 mt-8 overflow-hidden rounded-[20px] border border-warm3 bg-paper">
      {committedRows.map((task, index) => {
        const isSelected = task.id === selectedTaskId;

        return (
          <View key={task.id}>
            <TaskRow
              task={task}
              selected={isSelected}
              titleInputRef={isSelected ? titleInputRef : undefined}
              onPress={() => onSelectTaskRow(task.id)}
              onChangeTitle={(value) => onChangeTaskTitle(task.id, value)}
              onRemove={isSelected ? onRemoveSelectedTaskRow : undefined}
            />
            {isSelected ? renderTimePanel() : null}
            {(index < committedRows.length - 1 || showAddTaskRow) && !isSelected ? (
              <RowDivider />
            ) : null}
          </View>
        );
      })}

      {showAddTaskRow ? (
        <>
          {committedRows.length > 0 ? <RowDivider /> : null}
          <DraftTaskRow
            task={draftTask}
            selected={Boolean(draftTask && selectedTaskId === draftTask.id)}
            inputRef={titleInputRef}
            onPress={draftTask ? () => onSelectTaskRow(draftTask.id) : onAddTaskRow}
            onFocusInput={() => {
              if (draftTask && selectedTaskId !== draftTask.id) {
                onSelectTaskRow(draftTask.id);
              }
            }}
            onChangeTitle={(value) => {
              if (draftTask) onChangeTaskTitle(draftTask.id, value);
            }}
            onRemove={onRemoveSelectedTaskRow}
          />
          {draftTask && selectedTaskId === draftTask.id ? renderTimePanel() : null}
        </>
      ) : null}
    </View>
  );
}
