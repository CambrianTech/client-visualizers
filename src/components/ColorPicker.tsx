import React, { useMemo, useState } from "react";
import "./ColorPicker.css";
import { PaintColor } from "react-home-ar";
import { Box, Fab, Tabs, Tab} from "@mui/material";
import { HsvColorPicker, HsvColor } from 'react-colorful';
import { styled } from "@mui/material/styles";
import TabPanel from './TabPanel';
import colorConvert from 'color-convert';

type ColorPickerProps = {
  hidden?: boolean
  colorClicked: (color: PaintColor) => void
};

interface StyledTabsProps {
  children?: React.ReactNode;
  value: number;
  onChange: (event: React.SyntheticEvent, newValue: number) => void;
}

interface StyledTabProps {
  label: string;
}

const StyledTabs = styled((props: StyledTabsProps) => (
  <Tabs
    {...props}
    TabIndicatorProps={{ children: <span className="MuiTabs-indicatorSpan" /> }}
  />
))({
  '& .MuiTabs-indicator': {
    display: 'flex',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  '& .MuiTabs-indicatorSpan': {
    maxWidth: 40,
    width: '100%',
    backgroundColor: '#FFFFFF',
  },
});

const StyledTab = styled((props: StyledTabProps) => <Tab disableRipple {...props} />)(
  ({ theme }) => ({
    textTransform: 'none',
    minWidth: 0,
    [theme.breakpoints.up('sm')]: {
      minWidth: 0,
    },
    fontWeight: theme.typography.fontWeightRegular,
    marginRight: theme.spacing(1),
    color: 'rgba(0, 0, 0, 0.85)',
    fontFamily: [
      '-apple-system',
      'BlinkMacSystemFont',
      '"Segoe UI"',
      'Roboto',
      '"Helvetica Neue"',
      'Arial',
      'sans-serif',
      '"Apple Color Emoji"',
      '"Segoe UI Emoji"',
      '"Segoe UI Symbol"',
    ].join(','),
    '&:hover': {
      color: '#40a9ff',
      opacity: 1,
    },
    '&.Mui-selected': {
      color: '#1890ff',
      fontWeight: theme.typography.fontWeightMedium,
    },
    '&.Mui-focusVisible': {
      backgroundColor: '#1890ff',
    },
  }),
);

export function ColorPicker(props: ColorPickerProps) {

  const colors = useMemo(() => {
    const colors: PaintColor[] = [];
    for (let i = 0; i < 1000; i++) {
      colors.push(new PaintColor());
    }
    return colors;
  }, [])

  const [isOpen, setIsOpen] = useState(true)

  const [value, setValue] = React.useState(0);

  const handleChange = (event: React.SyntheticEvent, newValue: number) => {
    setValue(newValue);
  }

  const a11yProps = (index: number) => {
    return {
      id: `simple-tab-${index}`,
      'aria-controls': `simple-tabpanel-${index}`,
    };
  }

  const [color, setColor] = useState({h: 0, s: 0, v: 0});

  const hsvToRgb = (color : HsvColor) => {
    const newRGB = colorConvert.hsv.rgb([color.h, color.s, color.v]);
    return new PaintColor(newRGB[0]/255, newRGB[1]/255, newRGB[2]/255);
  };

  const handleColorChange = (color : HsvColor) => {
    setColor(color);
    const paintColor : PaintColor = hsvToRgb(color);
    props.colorClicked(paintColor);
  };

  return (
    <div className={`color-picker ${isOpen ? "open" : "closed"}`} style={{ visibility: props.hidden ? "hidden" : "visible" }}>
      <Fab className={"toggle"} variant={"extended"} onClick={() => setIsOpen(!isOpen)}>Colors</Fab>
      <div className={"wrapper"}>
        <Box sx={{ width: '100%' }}>
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <StyledTabs value={value} onChange={handleChange} aria-label="disabled tabs example">
              <StyledTab label="Swatches" {...a11yProps(0)} />
              <StyledTab label="Color Picker" {...a11yProps(1)} />
            </StyledTabs>
            <TabPanel value={value} index={0}>
              <div className={"wrapper"}>
                <div className={"scroller"} style={{ width: 'auto', padding: '0px' }}>
                  {colors.map((c, index) => {
                    return <div onClick={() => props.colorClicked(c)} key={`color-${index}`} className={"swatch"} style={{ backgroundColor: c.cssColor }}></div>
                  })}
                </div>
              </div>
            </TabPanel>
            <TabPanel value={value} index={1}>
              <section style={{ width: 'auto', padding: '0px' }}>
                <HsvColorPicker style={{ width: 'auto' }} color={color} onChange={handleColorChange} />
              </section>
            </TabPanel>
          </Box>
        </Box>
      </div>
    </div>
  );
}
