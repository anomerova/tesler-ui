import React from 'react'
import {
    Input,
    Popover,
    Button
} from 'antd'
import InputDefaultClass from 'antd/lib/input/TextArea'
import styles from './TextArea.less'
import ReadOnlyField from '../ReadOnlyField/ReadOnlyField'

export interface TextAreaProps {
    defaultValue?: string | null,
    maxInput?: number,
    onChange?: (value: string) => void,
    popover?: boolean,
    disabled?: boolean,
    readOnly?: boolean,
    style?: React.CSSProperties,
    minRows?: number,
    maxRows?: number,
    className?: string,
    backgroundColor?: string,
    onDrillDown?: () => void,
    forceFocus?: boolean,
}

const TextArea: React.FunctionComponent<TextAreaProps> = (props) => {
    if (props.readOnly) {
        return <ReadOnlyField
            className={props.className}
            backgroundColor={props.backgroundColor}
            onDrillDown={props.onDrillDown}
        >
            {props.defaultValue}
        </ReadOnlyField>
    }

    const inputRef = React.useRef<Input>(null)
    const textAreaRef = React.useRef<InputDefaultClass>(null)

    const [popoverVisible, setPopoverVisible] = React.useState<boolean>(false)

    const popoverTextAreaBlurHandler = React.useCallback(
        (event: React.FormEvent<HTMLTextAreaElement>) => {
            props.onChange(event.currentTarget.value)
        },
        [props.onChange]
    )

    const popoverHideHandler = React.useCallback(
        () => {
            setPopoverVisible(false)
        },
        []
    )

    const popoverVisibleChangeHandler = React.useCallback(
        (value: boolean) => {
            setPopoverVisible(value)
        },
        []
    )

    const onChangeHandler = React.useCallback(
        (e: React.FormEvent<HTMLTextAreaElement>) => {
            if (props.maxInput && e.currentTarget.value.length > props.maxInput) {
                e.currentTarget.value = e.currentTarget.value.slice(0, props.maxInput)
            }
        },
        [props.maxInput]
    )

    const onTextAreaShowed = React.useCallback(
        () => {
            if (textAreaRef.current) {
                textAreaRef.current.focus()
                // Доступ к private-полю, чтобы исправить баг в IE11 когда фокус при первом открытии выставляется в начало, а не в конец
                // TODO: разобраться откуда баг и как его убрать без отказа от анимации
                if (props.defaultValue) {
                    const textArea = (textAreaRef.current as any).textAreaRef as HTMLTextAreaElement
                    textArea.setSelectionRange(props.defaultValue.length, props.defaultValue.length)
                }
            }
        },
        []
    )

    const {
        popover,
        disabled,
        defaultValue
    } = props

    // кеу для Input.TextArea равен defaultValue для того чтобы поле ввода обновлялось при приходе нового значения из props
    const key = JSON.stringify(defaultValue)

    if (popover) {
        const rcTooltipProps = { afterVisibleChange: onTextAreaShowed }
        return <Popover
            {...rcTooltipProps}
            placement="right"
            title={''}
            overlayClassName={styles.popoverCard}
            content={
                <div className={styles.popoverCardInnerWrapper}>
                    <Input.TextArea
                        ref={textAreaRef}
                        key={key}
                        defaultValue={defaultValue}
                        rows={4}
                        onChange={onChangeHandler}
                        onBlur={popoverTextAreaBlurHandler}
                        disabled={disabled}
                    />
                    <Button
                        className={styles.popoverOkBtn}
                        icon="check"
                        onClick={popoverHideHandler}
                    />
                </div>
            }
            trigger="click"
            visible={popoverVisible}
            onVisibleChange={popoverVisibleChangeHandler}
        >
            <Input
                readOnly={true}
                value={defaultValue}
                style={props.style}
                className={styles.pointer}
                ref={inputRef}
            />
        </Popover>
    } else {
        return <Input.TextArea
            key={key}
            defaultValue={defaultValue}
            autosize={{
                minRows: props.minRows || 5,
                maxRows: props.maxRows || 10
            }}
            disabled={disabled}
            onChange={onChangeHandler}
            onBlur={popoverTextAreaBlurHandler}
            style={props.style}
            className={props.className}
            autoFocus={props.forceFocus}
        />
    }
}

export default React.memo(TextArea)
